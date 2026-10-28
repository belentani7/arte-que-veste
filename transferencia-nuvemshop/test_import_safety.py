"""Fail-first tests: import must be idempotent and reject bad CSV before writes."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from safe_nuvemshop import safe_api_path

SCRIPT = Path(__file__).with_name("upload-products.py")
spec = importlib.util.spec_from_file_location("upload_products", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImportSafetyTests(unittest.TestCase):
    def test_sku_lookup_only_allowlisted(self):
        self.assertEqual(
            safe_api_path("/123/products/sku/VFJ-001"),
            "/v1/123/products/sku/VFJ-001",
        )
        for path in (
            "/123/products/sku/../orders",
            "/123/products/sku/x?x=y",
            "/123/products/sku/evil%2Forders",
        ):
            with self.subTest(path=path), self.assertRaises(ValueError):
                safe_api_path(path)

    def test_404_means_absent_only_when_explicitly_allowed(self):
        for status, missing_ok, expected in (
            (404, True, None), (404, False, "error"), (401, True, "error")
        ):
            with self.subTest(status=status, missing_ok=missing_ok):
                with patch.object(module.http.client, "HTTPSConnection") as factory:
                    response = factory.return_value.getresponse.return_value
                    response.status = status
                    response.read.return_value = b"{}"
                    if expected is None:
                        self.assertIsNone(
                            module.api_request(
                                "GET", "/123/products/sku/ABC", token="x",
                                missing_ok=missing_ok
                            )
                        )
                    else:
                        with self.assertRaises(RuntimeError):
                            module.api_request(
                                "GET", "/123/products/sku/ABC", token="x",
                                missing_ok=missing_ok
                            )

    def test_categories_from_second_page_are_not_duplicated(self):
        batch = [{"name": {"pt": f"Other-{i}"}, "id": i + 1} for i in range(200)]
        final = [{"name": {"pt": "Feminino"}, "id": 999}]
        with patch.object(module, "api_request", side_effect=[batch, final]) as request, \
             patch.object(module, "create_category", return_value=1000):
            result = module.get_or_create_categories("token", "123")
        self.assertEqual(result["Feminino"], 999)
        self.assertEqual(request.call_count, 2)
        self.assertEqual(
            request.call_args_list[1].args[:2],
            ("GET", "/123/categories?page=2&per_page=200"),
        )

    def test_existing_sku_is_not_created_again(self):
        row = {"sku": "VFJ-001", "nome": "X"}
        with patch.object(module, "api_request", return_value={"id": 99}) as request:
            self.assertIsNone(module.create_product("token", "123", row, {}))
        request.assert_called_once_with(
            "GET", "/123/products/sku/VFJ-001", token="token", missing_ok=True
        )

    def test_missing_sku_is_created_exactly_once(self):
        row = {
            "sku": "VFJ-001",
            "nome": "Vestido",
            "descricao": "abc",
            "preco": "10.00",
            "categoria": "feminino",
            "estoque": "3",
            "peso_kg": "0.1",
            "largura_cm": "10",
            "altura_cm": "5",
            "comprimento_cm": "8",
        }
        with patch.object(
            module, "api_request", side_effect=[None, {"id": 33}]
        ) as request:
            self.assertEqual(
                module.create_product("token", "123", row, {}), {"id": 33}
            )
        self.assertEqual(request.call_count, 2)
        self.assertEqual(request.call_args_list[1].args[:2], ("POST", "/123/products"))

    def test_duplicate_sku_in_csv_fails_before_network(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "products.csv"
            path.write_text(
                "sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm\n"
                "SKU1;Producto1;abc;10;feminino;1;0.5;10;20;30\n"
                "SKU1;Producto2;def;20;feminino;1;0.5;10;20;30\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--dry-run", "--csv", str(path)],
                capture_output=True,
                text=True,
                timeout=10,
            )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SKU", result.stderr + result.stdout)

    def test_invalid_price_fails_preflight(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "products.csv"
            path.write_text(
                "sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm\n"
                "SKU1;Producto1;abc;-10;feminino;1;0.5;10;20;30\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--dry-run", "--csv", str(path)],
                capture_output=True,
                text=True,
                timeout=10,
            )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("preco", result.stderr + result.stdout)


    def test_csv_extra_cell_fails_before_network(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "extra.csv"
            path.write_text(
                "sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm;NCM;CFOP\n"
                "SKU1;Vestido;desc;10.00;feminino;1;0.5;10;20;30;6104;5102;EXTRA\n",
                encoding="utf-8",
            )
            with patch.object(module, "api_request") as request:
                with self.assertRaisesRegex(ValueError, "columnas"):
                    module.load_products_from_csv(path)
                request.assert_not_called()

    def test_duplicate_price_header_fails_before_network(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.csv"
            path.write_text(
                "sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm;preco\n"
                "SKU1;Vestido;desc;10.00;feminino;1;0.5;10;20;30;0.01\n",
                encoding="utf-8",
            )
            with patch.object(module, "api_request") as request:
                with self.assertRaisesRegex(ValueError, "duplicadas"):
                    module.load_products_from_csv(path)
                request.assert_not_called()

    def test_missing_optional_tax_cell_fails_preflight(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "short.csv"
            path.write_text(
                "sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm;NCM;CFOP\n"
                "SKU1;Vestido;desc;10.00;feminino;1;0.5;10;20;30;6104\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "columnas"):
                module.load_products_from_csv(path)

    def test_utf8_bom_and_optional_tax_columns_are_supported(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bom.csv"
            path.write_text(
                "\ufeffsku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm;NCM;CFOP\n"
                "SKU1;Vestido;desc;10.00;feminino;1;0.5;10;20;30;6104;5102\n",
                encoding="utf-8",
            )
            rows = module.load_products_from_csv(path)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["sku"], "SKU1")
            self.assertEqual(rows[0]["NCM"], "6104")


if __name__ == "__main__":
    unittest.main()

"""Fail-first tests: import must be idempotent and reject bad CSV before writes."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from safe_nuvemshop import safe_api_url

SCRIPT = Path(__file__).with_name("upload-products.py")
spec = importlib.util.spec_from_file_location("upload_products", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImportSafetyTests(unittest.TestCase):
    def test_sku_lookup_only_allowlisted(self):
        self.assertEqual(
            safe_api_url("/123/products/sku/VFJ-001"),
            "https://api.nuvemshop.com.br/v1/123/products/sku/VFJ-001",
        )
        for path in (
            "/123/products/sku/../orders",
            "/123/products/sku/x?x=y",
            "/123/products/sku/evil%2Forders",
        ):
            with self.subTest(path=path), self.assertRaises(ValueError):
                safe_api_url(path)

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


if __name__ == "__main__":
    unittest.main()

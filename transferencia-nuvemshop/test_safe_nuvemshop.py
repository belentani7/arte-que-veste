"""Nuvemshop transport path and authentication boundary tests."""
import unittest
from unittest.mock import patch
from safe_nuvemshop import safe_api_path
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).with_name("upload-products.py")
spec = importlib.util.spec_from_file_location("upload_products", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TransportSecurityTests(unittest.TestCase):
    def test_valid_products_path(self):
        self.assertEqual(safe_api_path("/123/products"), "/v1/123/products")

    def test_valid_categories_path(self):
        self.assertEqual(safe_api_path("/123/categories"), "/v1/123/categories")

    def test_malformed_store_or_resource_is_rejected(self):
        invalid = (
            "/0/products", "/-1/products", "/foo/products", "//evil/products",
            "/123/../products", "/123//products", "/123/products/123",
            "/123/products?redirect=https://evil.test", "/123/orders",
            "/123/products#fragment", "/9999999999999999999999/products",
        )
        for path in invalid:
            with self.subTest(path=path), self.assertRaises(ValueError):
                safe_api_path(path)

    def test_fixed_https_host_and_json_response(self):
        with patch.object(module.http.client, "HTTPSConnection") as factory:
            response = factory.return_value.getresponse.return_value
            response.status = 200
            response.read.return_value = b'{"ok": true}'
            self.assertEqual(module.api_request("GET", "/123/categories", token="dummy"), {"ok": True})
        factory.assert_called_once_with("api.nuvemshop.com.br", timeout=20)
        self.assertEqual(factory.return_value.request.call_args.args[:2],
                         ("GET", "/v1/123/categories"))
        self.assertEqual(factory.return_value.request.call_count, 1)
        factory.return_value.close.assert_called_once()

    def test_upstream_error_body_is_never_logged_or_exposed(self):
        marker = "CANARY-PRIVATE-ACCESS-TOKEN"
        with patch.object(module.http.client, "HTTPSConnection") as factory:
            response = factory.return_value.getresponse.return_value
            response.status = 401
            response.read.return_value = ('{"error":"' + marker + '"}').encode()
            with patch("builtins.print") as printed:
                with self.assertRaisesRegex(RuntimeError, "HTTP 401") as error:
                    module.api_request("GET", "/123/categories", token="dummy")
            self.assertNotIn(marker, str(error.exception))
            self.assertNotIn(marker, str(printed.call_args_list))
            response.read.assert_not_called()
            factory.return_value.close.assert_called_once()

    def test_missing_or_malformed_token_is_rejected_before_network(self):
        for token in (None, "", " ", "abc\\r\\nInjected: header", " abc"):
            with self.subTest(token=repr(token)):
                with patch.object(module.http.client, "HTTPSConnection") as factory:
                    with self.assertRaisesRegex(ValueError, "Token Nuvemshop"):
                        module.api_request("GET", "/123/categories", token=token)
                    factory.assert_not_called()

    def test_http_redirect_does_not_trigger_second_request(self):
        with patch.object(module.http.client, "HTTPSConnection") as factory:
            response = factory.return_value.getresponse.return_value
            response.status = 302
            response.read.return_value = b''
            with self.assertRaisesRegex(RuntimeError, "HTTP 302"):
                module.api_request("GET", "/123/categories", token="dummy")
        factory.return_value.request.assert_called_once()
        factory.return_value.close.assert_called_once()


class ImporterCliTests(unittest.TestCase):
    def make_csv(self, directory):
        csv_file = Path(directory) / "test.csv"
        csv_file.write_text(
            "sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm\n"
            "ABC-1;Produto teste;Test;10.00;feminino;1;0.5;10;20;30\n",
            encoding="utf-8",
        )
        return csv_file

    def test_dry_run_never_requires_credentials_or_store_id(self):
        import subprocess, sys, tempfile
        with tempfile.TemporaryDirectory() as directory:
            csv_file = self.make_csv(directory)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--dry-run", "--csv", str(csv_file)],
                env={}, text=True, capture_output=True, timeout=15, check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Produto teste", result.stdout)

    def test_invalid_store_id_blocks_all_network_access(self):
        import subprocess, sys, tempfile
        with tempfile.TemporaryDirectory() as directory:
            csv_file = self.make_csv(directory)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--csv", str(csv_file),
                 "--store-id", "../123", "--token", "dummy"],
                text=True, capture_output=True, timeout=15, check=False,
            )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--store-id", result.stderr)
        self.assertNotIn("Configurando categorías", result.stdout)


if __name__ == "__main__":
    unittest.main()

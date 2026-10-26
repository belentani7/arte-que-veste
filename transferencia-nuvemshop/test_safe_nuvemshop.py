"""Regression tests for the authenticated Nuvemshop migration importer."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
import urllib.request

from safe_nuvemshop import RejectRedirect, open_nuvemshop, safe_api_url


SCRIPT = Path(__file__).with_name("upload-products.py")


class TransportSecurityTests(unittest.TestCase):
    def test_valid_products_url(self):
        self.assertEqual(safe_api_url("/123/products"), "https://api.nuvemshop.com.br/v1/123/products")

    def test_valid_categories_url(self):
        self.assertEqual(safe_api_url("/123/categories"), "https://api.nuvemshop.com.br/v1/123/categories")

    def test_malformed_store_or_resource_is_rejected(self):
        invalid = (
            "/0/products", "/-1/products", "/foo/products", "//evil/products",
            "/123/../products", "/123//products", "/123/products/123",
            "/123/products?redirect=https://evil.test", "/123/orders",
            "/123/products#fragment", "/9999999999999999999999/products",
        )
        for path in invalid:
            with self.subTest(path=path):
                with self.assertRaises(ValueError):
                    safe_api_url(path)

    def test_http_redirect_is_not_followed(self):
        self.assertIsNone(
            RejectRedirect().redirect_request(None, None, 302, "Redirect", {}, "https://evil.test")
        )

    def test_open_uses_no_redirect_handler_and_timeout(self):
        sentinel = object()
        opener = Mock()
        opener.open.return_value = sentinel
        req = urllib.request.Request("https://api.nuvemshop.com.br/v1/123/products")
        with patch("safe_nuvemshop.urllib.request.build_opener", return_value=opener) as build:
            self.assertIs(open_nuvemshop(req), sentinel)
        self.assertTrue(any(isinstance(x, RejectRedirect) for x in build.call_args.args))
        opener.open.assert_called_once_with(req, timeout=20)


class ImporterCliTests(unittest.TestCase):
    def make_csv(self, directory):
        csv_file = Path(directory) / "test.csv"
        csv_file.write_text("sku;nome;descricao;preco;categoria;estoque;peso_kg;largura_cm;altura_cm;comprimento_cm\nABC-1;Produto teste;Test;10.00;feminino;1;0.5;10;20;30\n", encoding="utf-8")
        return csv_file

    def test_dry_run_never_requires_credentials_or_store_id(self):
        with tempfile.TemporaryDirectory() as directory:
            csv_file = self.make_csv(directory)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--dry-run", "--csv", str(csv_file)],
                env={}, text=True, capture_output=True, timeout=15, check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Produto teste", result.stdout)

    def test_invalid_store_id_blocks_all_network_access(self):
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

"""Suite de verificación Python para Arte Que Veste.

Compatible con `python -m unittest discover` (AGENTS.md) y `pytest` (README.md).
"""
import csv
import importlib.util
import json
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


class TestArteQueVesteData(unittest.TestCase):
    def test_catalogo_metadata_consistente(self):
        catalogo_json = json.loads((REPO_ROOT / "data" / "catalogo.json").read_text(encoding="utf-8"))
        self.assertEqual(catalogo_json["repo"], "arte-que-veste")

        spec = importlib.util.spec_from_file_location("catalogo", REPO_ROOT / "data" / "catalogo.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        info = mod.info()
        self.assertEqual(info["repo"], "arte-que-veste")

    def test_frontend_products_y_backend_seed_coherentes(self):
        products = json.loads((REPO_ROOT / "frontend" / "products.json").read_text(encoding="utf-8"))
        seed = json.loads((REPO_ROOT / "backend" / "seed.json").read_text(encoding="utf-8"))

        self.assertGreaterEqual(len(products), 8)
        skus_frontend = {p["sku"] for p in products}
        skus_seed = {p["sku"] for p in seed}
        self.assertEqual(skus_frontend, skus_seed)

        for p in products:
            img_path = REPO_ROOT / "frontend" / p["img"]
            self.assertTrue(img_path.is_file(), f"Falta imagen {p['img']} para {p['sku']}")

    def test_nuvemshop_csv_y_loader(self):
        csv_path = REPO_ROOT / "transferencia-nuvemshop" / "produtos-arte-que-veste.csv"
        self.assertTrue(csv_path.is_file())

        spec = importlib.util.spec_from_file_location(
            "upload_products", REPO_ROOT / "transferencia-nuvemshop" / "upload-products.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        rows = mod.load_products_from_csv(str(csv_path))
        self.assertGreaterEqual(len(rows), 8)
        for row in rows:
            self.assertTrue(row["sku"])
            self.assertTrue(row["nome"])
            self.assertGreater(float(row["preco"]), 0)


if __name__ == "__main__":
    unittest.main()

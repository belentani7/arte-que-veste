"""
Arte Que Veste — Subir productos a Nuvemshop via API REST
Uso: python upload-products.py --token TOKEN --store-id STORE_ID
"""
import csv
import json
import time
import argparse
import urllib.request
import urllib.error

API_BASE = "https://api.nuvemshop.com.br/v1"
USER_AGENT = "ArteQueVeste Upload Script (contato@belentani.com)"


def api_request(method, path, data=None, token=None):
    """Realiza una petición a la API de Nuvemshop."""
    url = f"{API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": USER_AGENT,
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"  ERROR {e.code}: {error_body[:300]}")
        raise


def create_category(token, store_id, name_pt):
    """Crea una categoría en la tienda."""
    data = {"name": {"pt": name_pt}}
    result = api_request("POST", f"/{store_id}/categories", data, token)
    print(f"  Categoria creada: {name_pt} (ID: {result['id']})")
    return result["id"]


def get_or_create_categories(token, store_id):
    """Obtiene o crea las categorías necesarias."""
    # Obtener categorías existentes
    existing = api_request("GET", f"/{store_id}/categories", token=token)
    cat_map = {c["name"].get("pt", ""): c["id"] for c in existing}

    categorias_necesarias = [
        "Feminino", "Masculino", "Infantil", "Acessorios",
        "Bijuteria", "Calcados", "Souvenirs"
    ]

    result = {}
    for cat in categorias_necesarias:
        if cat in cat_map:
            print(f"  Categoria existente: {cat} (ID: {cat_map[cat]})")
            result[cat] = cat_map[cat]
        else:
            result[cat] = create_category(token, store_id, cat)
            time.sleep(0.5)  # Rate limit

    return result


def create_product(token, store_id, product_data, categories):
    """Crea un producto en la tienda."""
    # Mapear categoría del CSV al ID de Nuvemshop
    cat_name_map = {
        "feminino": "Feminino",
        "masculino": "Masculino",
        "infantil": "Infantil",
        "acessorios": "Acessorios",
        "bijuteria": "Bijuteria",
        "calcados": "Calcados",
        "souvenirs": "Souvenirs",
    }

    cat_id = categories.get(cat_name_map.get(product_data["categoria"], ""), None)

    product = {
        "name": {"pt": product_data["nome"]},
        "description": {"pt": product_data["descricao"]},
        "published": True,
        "free_shipping": False,
        "requires_shipping": True,
        "variants": [
            {
                "price": product_data["preco"],
                "sku": product_data["sku"],
                "stock_management": True,
                "stock": int(product_data["estoque"]),
                "weight": product_data["peso_kg"],
                "width": product_data["largura_cm"],
                "height": product_data["altura_cm"],
                "depth": product_data["comprimento_cm"],
            }
        ],
        "tags": f"artesanal, nordeste, {product_data['categoria']}",
    }

    if cat_id:
        product["categories"] = [cat_id]

    result = api_request("POST", f"/{store_id}/products", product, token)
    print(f"  Produto criado: {product_data['nome']} (ID: {result['id']})")
    return result


def load_products_from_csv(csv_path):
    """Lee los productos del CSV."""
    products = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            products.append(row)
    return products


def main():
    parser = argparse.ArgumentParser(description="Subir productos a Nuvemshop")
    parser.add_argument("--token", required=True, help="Access token de Nuvemshop")
    parser.add_argument("--store-id", required=True, help="ID de la tienda")
    parser.add_argument(
        "--csv",
        default="produtos-arte-que-veste.csv",
        help="Ruta al CSV de productos",
    )
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar, no subir")
    args = parser.parse_args()

    print("=" * 60)
    print("Arte Que Veste — Upload a Nuvemshop")
    print("=" * 60)

    # Cargar productos
    print(f"\n1. Cargando productos desde {args.csv}...")
    products = load_products_from_csv(args.csv)
    print(f"   {len(products)} productos encontrados")

    if args.dry_run:
        print("\n[DRY RUN] Productos que se crearían:")
        for p in products:
            print(f"  - {p['nome']} | R${p['preco']} | SKU: {p['sku']}")
        return

    # Crear/obtener categorías
    print("\n2. Configurando categorías...")
    categories = get_or_create_categories(args.token, args.store_id)

    # Crear productos
    print(f"\n3. Subiendo {len(products)} productos...")
    created = 0
    errors = 0

    for product in products:
        try:
            create_product(args.token, args.store_id, product, categories)
            created += 1
            time.sleep(0.5)  # Rate limit: 2 req/s
        except Exception as e:
            print(f"  ERROR creando {product['nome']}: {e}")
            errors += 1

    print(f"\n{'=' * 60}")
    print(f"RESUMEN: {created} productos creados, {errors} errores")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()

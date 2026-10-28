"""
Arte Que Veste — Subir productos a Nuvemshop via API REST
Uso: python upload-products.py --dry-run  (sin red ni credenciales)
Ejecución real: configurar NUVEMSHOP_ACCESS_TOKEN en el entorno, y --store-id ID
"""
import csv
import http.client
import json
import time
import argparse
import os
import re
from pathlib import Path
from decimal import Decimal, InvalidOperation

from safe_nuvemshop import safe_api_path

API_HOST = "api.nuvemshop.com.br"
USER_AGENT = "ArteQueVeste Upload Script (contato@belentani.com)"


def api_request(method, path, data=None, token=None, missing_ok=False):
    """Only a fixed Nuvemshop host and allowlisted path can receive the token."""
    if method not in {"GET", "POST"}:
        raise ValueError("Método HTTP no permitido")
    uri = safe_api_path(path)
    if (not isinstance(token, str) or not token.strip() or token != token.strip()
            or "\r" in token or "\n" in token):
        raise ValueError("Token Nuvemshop ausente o inválido")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": USER_AGENT,
    }
    body = json.dumps(data).encode("utf-8") if data is not None else None
    conn = http.client.HTTPSConnection(API_HOST, timeout=20)
    try:
        conn.request(method, uri, body=body, headers=headers)
        response = conn.getresponse()
        if response.status == 404 and missing_ok:
            return None
        if not 200 <= response.status < 300:
            # Error bodies can echo bearer credentials or customer data; never log them.
            raise RuntimeError(f"HTTP {response.status} en recurso Nuvemshop")
        payload = response.read().decode("utf-8")
        return json.loads(payload)
    finally:
        conn.close()


def create_category(token, store_id, name_pt):
    """Crea una categoría en la tienda."""
    data = {"name": {"pt": name_pt}}
    result = api_request("POST", f"/{store_id}/categories", data, token)
    print(f"  Categoria creada: {name_pt} (ID: {result['id']})")
    return result["id"]


def get_or_create_categories(token, store_id):
    """Obtiene o crea las categorías necesarias."""
    # Obtener categorías existentes
    cat_map = {}
    for page in range(1, 1001):
        batch = api_request("GET", f"/{store_id}/categories?page={page}&per_page=200", token=token)
        if not isinstance(batch, list):
            raise ValueError("Respuesta de categorías inválida")
        cat_map.update({c["name"].get("pt", ""): c["id"] for c in batch})
        if len(batch) < 200:
            break
    else:
        raise RuntimeError("Demasiadas páginas de categorías; importación suspendida")

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
    sku = product_data["sku"]
    existing = api_request("GET", f"/{store_id}/products/sku/{sku}", token=token, missing_ok=True)
    if existing is not None:
        print(f"  SKU ya existente: {sku}; se omite sin modificarlo")
        return None
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
    # The supplied catalog includes optional NCM/CFOP columns. Preserve them,
    # but never silently discard extra cells or overwrite duplicate headers:
    # either can change the price/stock associated with a SKU.
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        headers = reader.fieldnames
        if not headers or any(not header or not header.strip() for header in headers):
            raise ValueError("CSV sin cabeceras válidas")
        if len(headers) != len(set(headers)):
            raise ValueError("CSV con cabeceras duplicadas")
        for line, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"Línea {line}: número de columnas inválido")
            products.append(row)
    validate_products(products)
    return products


def validate_products(products):
    """Fail the entire import before the first network call on inconsistent data."""
    required = (
        "sku", "nome", "descricao", "preco", "categoria", "estoque",
        "peso_kg", "largura_cm", "altura_cm", "comprimento_cm",
    )
    categories = {"feminino", "masculino", "infantil", "acessorios", "bijuteria", "calcados", "souvenirs"}
    if not products:
        raise ValueError("El CSV no contiene productos")
    seen = set()
    for line, product in enumerate(products, start=2):
        for field in required:
            if field not in product or not isinstance(product[field], str) or not product[field].strip():
                raise ValueError(f"Línea {line}: campo obligatorio ausente: {field}")
            product[field] = product[field].strip()
        sku = product["sku"]
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._~-]{0,63}", sku):
            raise ValueError(f"Línea {line}: SKU no admitido ({sku!r})")
        if sku in seen:
            raise ValueError(f"Línea {line}: SKU duplicado en CSV: {sku}")
        seen.add(sku)
        if product["categoria"] not in categories:
            raise ValueError(f"Línea {line}: categoria desconocida: {product['categoria']}")
        if not re.fullmatch(r"[0-9]+", product["estoque"]):
            raise ValueError(f"Línea {line}: estoque debe ser un entero no negativo")
        for field in ("preco", "peso_kg", "largura_cm", "altura_cm", "comprimento_cm"):
            try:
                value = Decimal(product[field])
            except InvalidOperation as exc:
                raise ValueError(f"Línea {line}: {field} inválido") from exc
            if not value.is_finite() or value <= 0:
                raise ValueError(f"Línea {line}: {field} debe ser positivo y finito")


def main():
    parser = argparse.ArgumentParser(description="Subir productos a Nuvemshop")
    parser.add_argument("--token", default=os.getenv("NUVEMSHOP_ACCESS_TOKEN"), help="Token de Nuvemshop (preferir variable NUVEMSHOP_ACCESS_TOKEN)")
    parser.add_argument("--store-id", default=os.getenv("NUVEMSHOP_STORE_ID"), help="ID numérico de la tienda (o NUVEMSHOP_STORE_ID)")
    parser.add_argument(
        "--csv",
        default=str(Path(__file__).with_name("produtos-arte-que-veste.csv")),
        help="Ruta al CSV de productos",
    )
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar, no subir")
    args = parser.parse_args()

    print("=" * 60)
    print("Arte Que Veste — Upload a Nuvemshop")
    print("=" * 60)

    # Cargar productos
    print(f"\n1. Cargando productos desde {args.csv}...")
    try:
        products = load_products_from_csv(args.csv)
    except (ValueError, OSError, UnicodeError) as exc:
        parser.error(str(exc))
    print(f"   {len(products)} productos encontrados")

    if args.dry_run:
        print("\n[DRY RUN] Productos que se crearían:")
        for p in products:
            print(f"  - {p['nome']} | R${p['preco']} | SKU: {p['sku']}")
        return

    # Ninguna credencial es necesaria para inspeccionar el CSV en dry-run.
    # En ejecuciones reales validamos antes de emitir cualquier petición.
    if not args.store_id or not re.fullmatch(r"[1-9][0-9]{0,14}", args.store_id):
        parser.error("--store-id debe ser un identificador numérico positivo (máximo 15 dígitos)")
    if not args.token:
        parser.error("falta --token o la variable NUVEMSHOP_ACCESS_TOKEN")

    # Crear/obtener categorías
    print("\n2. Configurando categorías...")
    categories = get_or_create_categories(args.token, args.store_id)

    # Crear productos
    print(f"\n3. Subiendo {len(products)} productos...")
    created = 0
    errors = 0
    skipped = 0

    for product in products:
        try:
            uploaded = create_product(args.token, args.store_id, product, categories)
            if uploaded is None:
                skipped += 1
            else:
                created += 1
            time.sleep(0.5)  # Rate limit: 2 req/s
        except Exception as e:
            print(f"  ERROR creando {product['nome']}: {e}")
            errors += 1

    print(f"\n{'=' * 60}")
    print(f"RESUMEN: {created} productos creados, {skipped} existentes, {errors} errores")
    print(f"{'=' * 60}")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

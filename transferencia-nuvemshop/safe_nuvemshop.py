"""Strict path allowlist for Nuvemshop HTTPS transport (fixed host; no redirects)."""
import re

_API_PATH = re.compile(
    r"/[1-9][0-9]{0,14}/(?:categories(?:\?page=[1-9][0-9]{0,3}&per_page=200)?|products|products/sku/[A-Za-z0-9][A-Za-z0-9._~-]{0,63})\Z",
    re.ASCII,
)


def safe_api_path(path):
    """Return a version-prefixed relative path; reject hosts, escapes and query injection."""
    if not isinstance(path, str) or not _API_PATH.fullmatch(path):
        raise ValueError("Ruta API inválida: fuera de categories, products o products/sku")
    return "/v1" + path

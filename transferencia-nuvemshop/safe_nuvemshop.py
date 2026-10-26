"""Restricted transport for the Arte Que Veste Nuvemshop v1 importer.

Only fixed HTTPS API endpoints may receive bearer credentials. Redirects are
refused to prevent Authorization from being forwarded to another host.
"""
import re
import urllib.request

API_BASE = "https://api.nuvemshop.com.br/v1"
_API_PATH = re.compile(r"/[1-9][0-9]{0,14}/(?:categories(?:\?page=[1-9][0-9]{0,3}&per_page=200)?|products|products/sku/[A-Za-z0-9][A-Za-z0-9._~-]{0,63})\Z", re.ASCII)


class RejectRedirect(urllib.request.HTTPRedirectHandler):
    """Do not follow any 30x reply while authenticated."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def safe_api_url(path):
    """Allow only known store-scoped endpoints, never arbitrary URL/path input."""
    if not isinstance(path, str) or not _API_PATH.fullmatch(path):
        raise ValueError("Ruta API inválida: se esperaba /{store_id}/categories o /{store_id}/products")
    return API_BASE + path


def open_nuvemshop(req, timeout=20):
    """Send a single HTTPS request without leaking auth headers via redirects."""
    opener = urllib.request.build_opener(RejectRedirect())
    return opener.open(req, timeout=timeout)

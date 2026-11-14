"""La fonction Vercel : jeton exigé, paramètres lus (sans modèle)."""

import io
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "cle-de-test-pour-les-jetons-0123456789"

import moteur_tajwid  # noqa: E402
from _tajwid import jeton  # noqa: E402


def appeler(methode: str, chemin: str, corps: bytes = b"", entetes: dict | None = None):
    h = moteur_tajwid.handler.__new__(moteur_tajwid.handler)
    h.path = chemin
    h.command = methode
    h.request_version = "HTTP/1.1"
    h.headers = {"Content-Length": str(len(corps)), **(entetes or {})}
    h.rfile = io.BytesIO(corps)
    h.wfile = io.BytesIO()
    envoye = {}
    h.send_response = lambda code, *_: envoye.setdefault("code", code)
    h.send_header = lambda *_: None
    h.end_headers = lambda: None
    getattr(h, f"do_{methode}")()
    return envoye["code"], json.loads(h.wfile.getvalue() or b"{}")


def un_jeton() -> str:
    import base64
    import hashlib
    import hmac

    corps = base64.urlsafe_b64encode(json.dumps({"u": "x", "exp": int(time.time()) + 60}).encode()).decode().rstrip("=")
    return corps + "." + hmac.new(jeton.cle(), corps.encode(), hashlib.sha256).hexdigest()


def test_get_dit_si_le_moteur_est_pret():
    assert appeler("GET", "/api/moteur_tajwid") == (200, {"pret": True})


def test_post_sans_jeton_est_refuse():
    code, corps = appeler("POST", "/api/moteur_tajwid?sourate=1&verset=2", b"\0\0" * 16000)
    assert code == 401 and "Connecte" in corps["erreur"]


def test_post_trop_gros_est_refuse():
    code, _ = appeler(
        "POST", "/api/moteur_tajwid?sourate=1&verset=2", b"\0\0" * 16000 * 32, {"Authorization": "Jeton " + un_jeton()}
    )
    assert code == 413


def test_post_verset_inconnu():
    code, corps = appeler(
        "POST", "/api/moteur_tajwid?sourate=abc", b"\0\0" * 16000, {"Authorization": "Jeton " + un_jeton()}
    )
    assert code == 400 and corps["erreur"]

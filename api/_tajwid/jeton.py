"""Jeton d'accès au moteur : délivré par l'appli (utilisateur connecté), valable quelques minutes.

Forme : base64url(JSON {"u": id utilisateur, "exp": horodatage}) + "." + HMAC-SHA256 en hexadécimal.
La clé est dérivée de la clé serveur Supabase (jamais transmise) : rien de plus à configurer.
"""

import base64
import hashlib
import hmac
import json
import os
import time

ETIQUETTE = b"suivi-coran/moteur-tajwid/v1:"


def cle() -> bytes | None:
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if len(secret) < 20:
        return None
    return hashlib.sha256(ETIQUETTE + secret.encode()).digest()


def verifier(jeton: str, maintenant: float | None = None) -> str | None:
    """Renvoie l'identifiant de l'utilisateur si le jeton est valide, sinon None."""
    k = cle()
    if not k or not jeton or jeton.count(".") != 1:
        return None
    corps, signature = jeton.split(".")
    attendue = hmac.new(k, corps.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(attendue, signature):
        return None
    try:
        donnees = json.loads(base64.urlsafe_b64decode(corps + "=" * (-len(corps) % 4)))
    except (ValueError, json.JSONDecodeError):
        return None
    t = time.time() if maintenant is None else maintenant
    if not isinstance(donnees, dict) or not isinstance(donnees.get("exp"), (int, float)) or donnees["exp"] < t:
        return None
    if donnees["exp"] > t + 600:  # jamais plus de 10 minutes
        return None
    u = donnees.get("u")
    return u if isinstance(u, str) and u else None

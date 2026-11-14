"""Fonction Vercel : POST /api/moteur_tajwid — analyse tajwid d'une récitation (voir _tajwid/moteur.py).

Requête : en-tête « Authorization: Jeton … » (délivré par /api/tajwid/jeton), paramètres sourate, verset, riwaya
(et texte, pour Warsh), corps = audio PCM 16 kHz mono 16 bits. Réponse : JSON {entendu, mots[]} ou {erreur}.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _tajwid import jeton  # noqa: E402
from _tajwid.moteur import DUREE_MAX, FREQ, ErreurSaisie, analyser  # noqa: E402

TAILLE_MAX = int((DUREE_MAX + 0.5) * FREQ * 2)


class handler(BaseHTTPRequestHandler):  # noqa: N801 (nom imposé par Vercel)
    def _repondre(self, statut: int, corps: dict) -> None:
        donnees = json.dumps(corps, ensure_ascii=False).encode()
        self.send_response(statut)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(donnees)))
        self.end_headers()
        self.wfile.write(donnees)

    def do_GET(self) -> None:  # noqa: N802
        self._repondre(200, {"pret": jeton.cle() is not None})

    def do_POST(self) -> None:  # noqa: N802
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Jeton ") or not jeton.verifier(auth[6:].strip()):
            self._repondre(401, {"erreur": "Connecte-toi pour utiliser la vérification."})
            return
        taille = int(self.headers.get("Content-Length") or 0)
        if taille <= 0 or taille > TAILLE_MAX:
            self._repondre(413, {"erreur": "30 secondes au plus : récite un verset à la fois."})
            return
        q = parse_qs(urlparse(self.path).query)
        try:
            sourate = int(q.get("sourate", ["0"])[0])
            verset = int(q.get("verset", ["0"])[0])
        except ValueError:
            self._repondre(400, {"erreur": "Verset inconnu."})
            return
        riwaya = q.get("riwaya", ["hafs"])[0]
        texte = q.get("texte", [None])[0]
        pcm = self.rfile.read(taille)
        try:
            self._repondre(200, analyser(pcm, sourate, verset, riwaya, texte))
        except ErreurSaisie as e:
            self._repondre(400, {"erreur": str(e)})
        except Exception:  # noqa: BLE001
            self._repondre(500, {"erreur": "L’analyse a échoué. Réessaie dans un instant."})

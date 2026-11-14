"""Fonction Vercel : POST /api/moteur_tajwid — analyse tajwid d'une récitation (voir _tajwid/moteur.py).

Requête : en-tête « Authorization: Jeton … » (délivré par /api/tajwid/jeton), corps = audio PCM 16 kHz mono 16 bits
(un morceau de 30 s au plus). Paramètres : sourate, riwaya, et
  - soit verset (un verset entier),
  - soit du, au, depuis (un morceau d'une récitation de plusieurs versets, situé à partir du mot « depuis »),
plus texte (répété, un par verset) pour Warsh. En-tête facultatif X-Tempo : JSON, le rythme rendu par le morceau
précédent. Réponse : JSON {entendu, mots[], couverts, tempo} ou {erreur}.
GET : préchauffe le moteur (modèle chargé) et dit s'il est prêt.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _tajwid import jeton  # noqa: E402
from _tajwid.moteur import DUREE_MAX, FREQ, ErreurSaisie, analyser, analyser_passage, session  # noqa: E402

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
        # Ouverture du mode Réciter : on charge le modèle pendant que l'élève se prépare.
        if "prechauffer" in parse_qs(urlparse(self.path).query):
            try:
                session()
                from quran_transcript import Aya  # noqa: F401  (charge le texte du Coran)
            except Exception:  # noqa: BLE001
                self._repondre(503, {"pret": False})
                return
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
        entier = lambda nom: int(q.get(nom, ["0"])[0])  # noqa: E731
        try:
            sourate, verset, du, au, depuis = (entier(n) for n in ("sourate", "verset", "du", "au", "depuis"))
            tempo = json.loads(self.headers.get("X-Tempo") or "[]")
        except (ValueError, json.JSONDecodeError):
            self._repondre(400, {"erreur": "Verset inconnu."})
            return
        riwaya = q.get("riwaya", ["hafs"])[0]
        textes = q.get("texte") or None
        pcm = self.rfile.read(taille)
        try:
            if verset:
                resultat = analyser(pcm, sourate, verset, riwaya, textes[0] if textes else None)
            else:
                resultat = analyser_passage(
                    pcm, sourate, du, au, riwaya, textes, depuis, tempo if isinstance(tempo, list) else None
                )
            self._repondre(200, resultat)
        except ErreurSaisie as e:
            self._repondre(400, {"erreur": str(e)})
        except Exception:  # noqa: BLE001
            self._repondre(500, {"erreur": "L’analyse a échoué. Réessaie dans un instant."})

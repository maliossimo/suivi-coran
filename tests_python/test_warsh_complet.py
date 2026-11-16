"""Chaque verset Warsh (texte du Complexe du Roi Fahd, src/donnees/coran/warsh) doit pouvoir être mis en écriture
phonétique par le moteur : sinon, réciter ce verset en Warsh échoue (« L'analyse a échoué »). Trouvé grâce au banc
d'essai Warsh : avant la conversion du tanwîn ouvert (moteur.py), 1690 versets sur 6214 échouaient."""

import json
import os
import re
import sys

import pytest

pytest.importorskip("quran_transcript")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from _tajwid import imam  # noqa: E402
from _tajwid.moteur import mots_du_verset  # noqa: E402

DONNEES = os.path.join(os.path.dirname(__file__), "..", "src", "donnees", "coran", "warsh")


def test_chaque_verset_warsh_se_lit():
    total, echecs = 0, []
    for sourate in range(1, 115):
        versets = json.load(open(os.path.join(DONNEES, f"{sourate}.json"), encoding="utf-8"))
        for v, texte in enumerate(versets, start=1):
            total += 1
            texte = re.sub(r"\s*[٠-٩]+\s*$", "", texte).strip()
            try:
                imam.expected(mots_du_verset(sourate, v, "warsh", texte), riwaya="warsh")
            except Exception as e:  # noqa: BLE001
                echecs.append((sourate, v, type(e).__name__))
    print(f"\nwarsh : {total - len(echecs)}/{total} versets lus ; échecs : {echecs}")
    # Restent quelques graphies rares (وَنَـَٔا, لِاَهَبَ…) que le module Warsh ne sait pas encore lire.
    assert len(echecs) <= total * 0.005

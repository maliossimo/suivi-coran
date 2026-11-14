"""Les couleurs du tajwid (src/donnees/coran/tajwid, texte Tanzil découpé par cpfair/quran-tajweed) sont
posées mot par mot sur les mots du moteur (quran-transcript) : il faut le même nombre de mots par verset.
Là où ce n'est pas le cas, l'appli affiche le mot sans couleurs : ce test mesure combien de versets."""

import json
import os

import pytest

quran_transcript = pytest.importorskip("quran_transcript")

DONNEES = os.path.join(os.path.dirname(__file__), "..", "src", "donnees", "coran", "tajwid")


def _mots_tajwid(segments: list) -> int:
    texte = "".join(s if isinstance(s, str) else s[1] for s in segments)
    return len([m for m in texte.split() if any("ء" <= c <= "ۓ" for c in m)])


def test_mots_du_moteur_et_des_couleurs_concordent():
    total, ecarts = 0, []
    for sourate in range(1, 115):
        versets = json.load(open(os.path.join(DONNEES, f"{sourate}.json"), encoding="utf-8"))
        for i, segments in enumerate(versets, start=1):
            total += 1
            moteur = len(quran_transcript.Aya(sourate, i).get().uthmani.split(" "))
            if moteur != _mots_tajwid(segments):
                ecarts.append((sourate, i, moteur, _mots_tajwid(segments)))
    print(f"\ncouleurs tajwid : {total - len(ecarts)}/{total} versets concordants ; écarts : {ecarts[:30]}")
    assert len(ecarts) <= total * 0.02

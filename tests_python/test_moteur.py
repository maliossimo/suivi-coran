"""Moteur tajwid : contrôles de saisie (sans modèle) et analyse réelle de récitations de référence.

Les tests « reel » téléchargent le modèle (Hugging Face) et des récitations (everyayah.com) : ils tournent en CI.
"""

import os
import subprocess
import sys
import time
import urllib.request

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from _tajwid import moteur  # noqa: E402
from _tajwid.moteur import ErreurSaisie, analyser  # noqa: E402

UNE_SECONDE = np.zeros(16000, "<i2").tobytes()


def test_refuse_une_lecture_inconnue():
    with pytest.raises(ErreurSaisie):
        analyser(UNE_SECONDE, 1, 2, "qalun")


def test_refuse_un_verset_inconnu():
    with pytest.raises(ErreurSaisie):
        analyser(UNE_SECONDE, 115, 1, "hafs")


def test_refuse_trop_court():
    with pytest.raises(ErreurSaisie, match="trop courte"):
        analyser(np.zeros(1000, "<i2").tobytes(), 1, 2, "hafs")


def test_refuse_trop_long():
    with pytest.raises(ErreurSaisie, match="30 secondes"):
        analyser(np.zeros(16000 * 32, "<i2").tobytes(), 1, 2, "hafs")


def test_warsh_demande_le_texte():
    with pytest.raises(ErreurSaisie, match="Texte"):
        analyser(UNE_SECONDE, 1, 2, "warsh")


def test_mel_a_80_bandes():
    mel = moteur._mel(np.zeros(16000, np.float32), padding=0)
    assert mel.shape[0] == 80


# ---------------------------------------------------------------- analyses réelles (réseau)

reel = pytest.mark.skipif(os.environ.get("TAJWID_REEL") != "1", reason="réseau : en CI seulement")


def recitation(recitateur: str, sourate: int, verset: int) -> bytes:
    url = f"https://everyayah.com/data/{recitateur}/{sourate:03d}{verset:03d}.mp3"
    mp3 = urllib.request.urlopen(url, timeout=30).read()  # noqa: S310
    return subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "s16le", "pipe:1"],
        input=mp3,
        capture_output=True,
        check=True,
    ).stdout


def resume(r):
    return [(m["mot"], m["etat"], [x["texte"] for x in m["remarques"]]) for m in r["mots"]]


@reel
@pytest.mark.parametrize(
    "recitateur,sourate,verset",
    [("Husary_128kbps", 1, 2), ("Husary_128kbps", 112, 1), ("Alafasy_128kbps", 1, 4), ("Husary_128kbps", 2, 4)],
)
def test_un_recitateur_est_juste(recitateur, sourate, verset):
    debut = time.time()
    r = analyser(recitation(recitateur, sourate, verset), sourate, verset, "hafs")
    print(f"\n{recitateur} {sourate}:{verset} ({time.time() - debut:.1f} s)", resume(r))
    justes = sum(m["etat"] == "juste" for m in r["mots"])
    assert justes >= len(r["mots"]) - 1, resume(r)  # le modèle se trompe parfois sur un mot (4 à 9 %)
    assert not any(m["etat"] in ("erreur", "oublie") for m in r["mots"]), resume(r)


@reel
def test_un_mot_coupe_est_signale():
    pcm = recitation("Husary_128kbps", 1, 2)
    coupe = pcm[: int(len(pcm) * 0.55) // 2 * 2]  # « ٱلْحَمْدُ لِلَّهِ » seulement
    r = analyser(coupe, 1, 2, "hafs")
    print("\ncoupé :", resume(r))
    assert r["mots"][-1]["etat"] in ("oublie", "erreur"), resume(r)


@reel
def test_empreinte_du_modele():
    import hashlib

    import json

    infos = json.load(urllib.request.urlopen("https://huggingface.co/api/models/Hisnlabs/tajweed-v2", timeout=30))  # noqa: S310
    print("\nrévision Hugging Face :", infos.get("sha"))
    chemin = moteur._chemin_modele()
    print("\nempreinte du modèle :", hashlib.sha256(open(chemin, "rb").read()).hexdigest(), os.path.getsize(chemin))

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
    for variante in moteur.VARIANTES:
        chemin = moteur._chemin_modele(variante)
        empreinte = hashlib.sha256(open(chemin, "rb").read()).hexdigest()
        print(f"\nempreinte du modèle {variante} :", empreinte, os.path.getsize(chemin), chemin)
        assert empreinte == moteur.VARIANTES[variante][1]


def test_modele_embarque_utilise_en_premier(tmp_path, monkeypatch):
    """Le modèle embarqué au déploiement sert directement, sans téléchargement."""
    (tmp_path / "int8.onnx").write_bytes(b"x")
    monkeypatch.setattr(moteur, "EMBARQUES", str(tmp_path))
    assert moteur._chemin_modele("int8") == str(tmp_path / "int8.onnx")


@reel
def test_plusieurs_versets_par_morceaux():
    """Al-Fatiha 2 à 4 récités d'affilée, envoyés en deux morceaux : chaque morceau est situé dans le passage."""
    from _tajwid.moteur import analyser_passage

    v2, v3, v4 = (recitation("Husary_128kbps", 1, v) for v in (2, 3, 4))
    debut = time.time()
    r1 = analyser_passage(v2 + v3, 1, 2, 4, "hafs", depuis=0)
    print("\nmorceau 1 :", r1["couverts"], resume(r1), f"{time.time() - debut:.1f} s")
    assert r1["couverts"][0] == 0
    assert [m["verset"] for m in r1["mots"]] == [2, 2, 2, 2, 3, 3], resume(r1)
    debuts = [m["debut"] for m in r1["mots"]]
    assert debuts == sorted(debuts) and all(m["fin"] > m["debut"] for m in r1["mots"])

    debut = time.time()
    r2 = analyser_passage(v4, 1, 2, 4, "hafs", depuis=r1["couverts"][1], tempo=r1["tempo"])
    print("morceau 2 :", r2["couverts"], resume(r2), f"{time.time() - debut:.1f} s")
    assert [m["verset"] for m in r2["mots"]] == [4, 4, 4], resume(r2)
    assert all(m["etat"] == "juste" for m in r1["mots"] + r2["mots"]), resume(r1) + resume(r2)


def test_passage_refuse_une_plage_impossible():
    from _tajwid.moteur import analyser_passage

    with pytest.raises(ErreurSaisie):
        analyser_passage(UNE_SECONDE, 1, 5, 2, "hafs")


def mulaw(pcm: bytes) -> bytes:
    """Encodeur G.711 μ-law (comme versMulaw côté navigateur)."""
    sortie = bytearray()
    for s in np.frombuffer(pcm, "<i2").astype(int):
        signe = 0x80 if s < 0 else 0
        s = min(abs(s), 32635) + 0x84
        exposant, masque = 7, 0x4000
        while exposant > 0 and not (s & masque):
            exposant -= 1
            masque >>= 1
        sortie.append(~(signe | (exposant << 4) | ((s >> (exposant + 3)) & 0x0F)) & 0xFF)
    return bytes(sortie)


def test_mulaw_relu_fidelement():
    x = np.array([0, 100, -100, 1000, -1000, 8000, -8000, 32000], "<i2")
    relu = moteur._mulaw(mulaw(x.tobytes())) * 32768
    assert np.all(np.abs(relu - x) <= np.maximum(8, np.abs(x) * 0.04))


@reel
def test_suivi_en_direct_situe_les_dernieres_secondes():
    from _tajwid.moteur import suivre

    v2, v3 = (recitation("Husary_128kbps", 1, v) for v in (2, 3))
    tout = v2 + v3
    fenetre = tout[-16000 * 2 * 8 :]  # 8 dernières secondes
    debut = time.time()
    r = suivre(mulaw(fenetre), 1, 2, 4, "hafs", depuis=2, avec_passage=True)
    print("\nsuivi :", r["couverts"], f"{time.time() - debut:.2f} s")
    assert r["couverts"][1] == 6  # arrivé à la fin du verset 3
    assert len(r["passage"]) == 9


@reel
def test_double_ecoute_garde_un_recitateur_juste():
    from _tajwid.moteur import Reglages, analyser_passage

    debut = time.time()
    r = analyser_passage(recitation("Husary_128kbps", 2, 4), 2, 4, 4, "hafs", reglages=Reglages(consensus=True))
    print("\ndouble écoute :", resume(r), f"{time.time() - debut:.2f} s")
    assert all(m["etat"] == "juste" for m in r["mots"]), resume(r)

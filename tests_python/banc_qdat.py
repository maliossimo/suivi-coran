"""Banc d'essai du moteur tajwid sur qdat_bench : 159 apprenants qui récitent Al-Maʾida 109,
annotés par des enseignants (https://huggingface.co/datasets/obadx/qdat_bench, MIT).

Usage (CI, réseau) : python tests_python/banc_qdat.py
Affiche le schéma des annotations, puis, pour chaque réglage (modèle, seuils), les remarques du moteur
sur les quatre règles annotées et les temps d'analyse, pour choisir les réglages à garder.
"""

import os
import subprocess
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from datasets import Audio, load_dataset  # noqa: E402

from _tajwid.moteur import Reglages, analyser_passage  # noqa: E402

# (nom, réglages, son envoyé en μ-law 8 bits)
CONFIGS = [
    ("1.24 (double écoute, 0,3 / 0,7)", Reglages(madd_tenu=None, madd_trop_long=None), False),
    ("madd tenu ≥ 1,25, trop long ≥ 3,2", Reglages(madd_tenu=1.25, madd_trop_long=3.2), False),
    ("madd tenu ≥ 1,25, trop long ≥ 3,5", Reglages(madd_tenu=1.25, madd_trop_long=3.5), False),
    ("madd tenu ≥ 1,25, trop long ≥ 3,8", Reglages(madd_tenu=1.25, madd_trop_long=3.8), False),
]

# Madd naturels annotés : (mot, rang du madd dans le mot, colonne de l'annotation en temps)
MADDS_ANNOTES = [(7, 0, "qalo_alif_len"), (7, 1, "qalo_waw_len"), (8, 0, "laa_alif_len"), (13, 0, "allam_alif_len")]


def via_mulaw(pcm: bytes) -> bytes:
    """Le son tel qu'il arriverait en μ-law (aller-retour), pour mesurer la perte."""
    import numpy as np

    from _tajwid.moteur import _mulaw

    x = np.frombuffer(pcm, "<i2").astype(np.int32)
    signe = np.where(x < 0, 0x80, 0)
    s = np.minimum(np.abs(x), 32635) + 0x84
    exposant = np.clip(np.floor(np.log2(np.maximum(s, 1) >> 7)).astype(int), 0, 7)
    mantisse = (s >> (exposant + 3)) & 0x0F
    u = (~(signe | (exposant << 4) | mantisse)) & 0xFF
    return (np.clip(_mulaw(u.astype(np.uint8).tobytes()) * 32768, -32768, 32767)).astype("<i2").tobytes()


def pcm(audio: dict) -> bytes:
    donnees = audio.get("bytes") or open(audio["path"], "rb").read()
    return subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "s16le", "pipe:1"],
        input=donnees,
        capture_output=True,
        check=True,
    ).stdout


# Les enregistrements commencent à « قَالُوا۟ » (mot 7 du verset 5:109). Pour chaque règle annotée :
# le mot concerné, la règle du moteur, et quand l'annotation dit que c'est juste.
REGLES = {
    "madd naturel (قالوا)": (7, "NormalMaddRule", lambda x: x["qalo_alif_len"] == 2 and x["qalo_waw_len"] == 2),
    "madd naturel (لا)": (8, "NormalMaddRule", lambda x: x["laa_alif_len"] == 2),
    "madd munfasil (لنآ)": (10, "MonfaselMaddRule", lambda x: x["separate_madd"] in (2, 4, 5)),
    "ghunna (إنّك)": (11, "ghunnah", lambda x: x["noon_moshaddadah_len"] == 1),
    "ikhfaʾ (أنت)": (12, "ikhfa", lambda x: x["noon_mokhfah_len"] == 2),
    "madd naturel (علّام)": (13, "NormalMaddRule", lambda x: x["allam_alif_len"] == 2),
    "qalqala (الغيوب)": (14, "qalqalah", lambda x: x["qalqalah"] == 1),
    "madd ʿarid (الغيوب)": (14, "AaredMaddRule", lambda x: x["madd_aared_len"] in (2, 4, 6)),
}


def main() -> None:
    ds = load_dataset("obadx/qdat_bench", split="train").cast_column("audio", Audio(decode=False))
    etiquettes = [{c: ds[i][c] for c in ds.column_names if c not in ("audio", "sifat")} for i in range(len(ds))]
    audios = [pcm(x["audio"]) for x in ds]
    # Durées des madd naturels à l'horloge (en voyelles brèves) selon l'annotation : pour régler les seuils.
    repartition: dict = {}
    for x, a in zip(etiquettes, audios):
        try:
            r = analyser_passage(a, 5, 109, 109, "hafs", depuis=7, diagnostic=True)
        except Exception:  # noqa: BLE001
            continue
        par_mot = {m["indice"]: sorted(m.get("mesures_madd", []), key=lambda d: d["pos"]) for m in r["mots"]}
        for mot, rang, colonne in MADDS_ANNOTES:
            ms = par_mot.get(mot, [])
            if rang < len(ms):
                cle = (x[colonne], "signe" if ms[rang]["symboles"] else "sans signe")
                repartition.setdefault(cle, []).append(ms[rang]["temps"])
    print("\n=== madd naturels mesurés (temps rapporté à une voyelle brève), par annotation")
    for (temps, signe), valeurs in sorted(repartition.items(), key=lambda kv: (str(kv[0][0]), kv[0][1])):
        v = sorted(valeurs)
        q = [v[int(len(v) * f)] for f in (0.1, 0.25, 0.5, 0.75, 0.9)] if len(v) >= 5 else v
        print(f"  annoté {temps} temps, {signe:10} n={len(v):3}  déciles 10/25/50/75/90 : {q}")

    for nom_config, reglages, en_mulaw in CONFIGS:
        debut = time.time()
        durees = []
        compte = {nom: Counter() for nom in REGLES}
        remarques_sur_juste, mots_justes = 0, 0
        for x, a in zip(etiquettes, audios):
            t = time.time()
            try:
                son = via_mulaw(a) if en_mulaw else a
                r = analyser_passage(son, 5, 109, 109, "hafs", depuis=7, reglages=reglages)
            except Exception as e:  # noqa: BLE001
                print("erreur :", e)
                continue
            durees.append(time.time() - t)
            par_mot = {m["indice"]: {n["regle"].split(":")[0] for n in m["remarques"]} for m in r["mots"]}
            for nom, (mot, regle, juste) in REGLES.items():
                signale = regle in par_mot.get(mot, set())
                compte[nom][("juste" if juste(x) else "faute", signale)] += 1
            # Mots dont toutes les règles annotées sont justes : une remarque y est (probablement) fausse.
            for mot in range(7, 15):
                regles_mot = [j for (m, _, j) in REGLES.values() if m == mot]
                if regles_mot and all(j(x) for j in regles_mot):
                    mots_justes += 1
                    remarques_sur_juste += bool(par_mot.get(mot))
        durees.sort()
        print(
            f"\n=== {nom_config} : {reglages} — {time.time() - debut:.0f} s, médiane {durees[len(durees) // 2]:.2f} s,"
            f" max {durees[-1]:.2f} s"
        )
        print(f"  remarques sur des mots annotés justes : {remarques_sur_juste}/{mots_justes}")
        for nom, c in compte.items():
            fautes = c[("faute", True)] + c[("faute", False)]
            justes = c[("juste", True)] + c[("juste", False)]
            print(
                f"  {nom:24} fautes repérées {c[('faute', True)]}/{fautes}"
                f"   fausses remarques {c[('juste', True)]}/{justes}"
            )


if __name__ == "__main__":
    main()

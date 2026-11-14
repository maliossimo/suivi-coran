"""Banc d'essai du moteur tajwid sur qdat_bench : 159 apprenants qui récitent Al-Maʾida 109,
annotés par des enseignants (https://huggingface.co/datasets/obadx/qdat_bench, MIT).

Usage (CI, réseau) : python tests_python/banc_qdat.py
Affiche le schéma des annotations, puis, pour chaque réglage (modèle, seuils), les remarques du moteur
sur les quatre règles annotées et les temps d'analyse, pour choisir les réglages à garder.
"""

import json
import os
import subprocess
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from datasets import Audio, load_dataset  # noqa: E402

from _tajwid.moteur import Reglages, analyser  # noqa: E402

CONFIGS = [
    Reglages("int8", 0.3, 0.7),
    Reglages("int8", 0.5, 0.8),
    Reglages("int8", 0.7, 0.9),
    Reglages("fp32", 0.3, 0.7),
    Reglages("fp32", 0.5, 0.8),
    Reglages("fp32", 0.7, 0.9),
]


def pcm(audio: dict) -> bytes:
    donnees = audio.get("bytes") or open(audio["path"], "rb").read()
    return subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "s16le", "pipe:1"],
        input=donnees,
        capture_output=True,
        check=True,
    ).stdout


def main() -> None:
    ds = load_dataset("obadx/qdat_bench", split="train").cast_column("audio", Audio(decode=False))
    colonnes = [c for c in ds.column_names if c != "audio"]
    print("colonnes :", colonnes)
    print("exemple :", json.dumps({c: ds[0][c] for c in colonnes}, ensure_ascii=False, default=str)[:3000])
    for c in colonnes:
        valeurs = Counter(str(v) for v in ds[c])
        if len(valeurs) <= 12:
            print(f"  {c}: {dict(valeurs)}")

    audios = [pcm(x["audio"]) for x in ds]
    for reglages in CONFIGS:
        debut = time.time()
        lignes, durees = [], []
        for i, a in enumerate(audios):
            t = time.time()
            try:
                r = analyser(a, 5, 109, "hafs", reglages=reglages)
            except Exception as e:  # noqa: BLE001
                lignes.append({"i": i, "erreur": str(e)})
                continue
            durees.append(time.time() - t)
            lignes.append(
                {
                    "i": i,
                    "id": ds[i]["id"],
                    "mots": [[m["etat"], [x["regle"] for x in m["remarques"]]] for m in r["mots"]],
                }
            )
        durees.sort()
        print(
            f"\n=== {reglages} — {time.time() - debut:.0f} s, médiane {durees[len(durees) // 2]:.2f} s,"
            f" max {durees[-1]:.2f} s"
        )
        print("RESULTATS " + json.dumps(lignes, ensure_ascii=False))


if __name__ == "__main__":
    main()

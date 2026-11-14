"""Banc d'essai sur des récitateurs de référence (everyayah.com) : des versets variés récités sans faute.
Toute remarque du moteur y est (presque sûrement) fausse : on mesure combien de mots sont repris à tort,
et par quelle règle, pour chaque réglage. Complète banc_qdat.py (un seul verset, mais des fautes annotées).

Usage (CI, réseau) : python tests_python/banc_recitateurs.py
"""

import os
import subprocess
import sys
import time
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from _tajwid.moteur import ErreurSaisie, Reglages, analyser  # noqa: E402

RECITATEURS = ["Husary_128kbps", "Alafasy_128kbps", "Minshawy_Murattal_128kbps"]

# Versets courts (≤ 30 s chez Husary), choisis pour couvrir les règles : madd (naturel, muttasil, munfasil,
# lazim, ʿarid), ghunna, ikhfaʾ, iqlab, idgham, qalqala, tafkhim…
VERSETS = (
    [(1, v) for v in range(1, 8)]
    + [(2, 2), (2, 5), (2, 1)]
    + [(36, v) for v in range(1, 6)]
    + [(55, v) for v in range(1, 9)]
    + [(67, 1), (67, 2)]
    + [(78, v) for v in range(1, 8)]
    + [(97, v) for v in range(1, 6)]
    + [(103, v) for v in range(1, 4)]
    + [(108, v) for v in range(1, 4)]
    + [(112, v) for v in range(1, 5)]
    + [(113, v) for v in range(1, 6)]
    + [(114, v) for v in range(1, 7)]
)

CONFIGS = [
    ("actuel (double écoute, 0,3 / 0,7)", Reglages(madd_long=None, madd_court=None)),
    ("madd à l'horloge 1,6 / 1,3", Reglages(madd_long=1.6, madd_court=1.3)),
    ("madd à l'horloge 1,4 / 1,2", Reglages(madd_long=1.4, madd_court=1.2)),
]


def telecharger(rec: str, sourate: int, verset: int) -> bytes | None:
    url = f"https://everyayah.com/data/{rec}/{sourate:03d}{verset:03d}.mp3"
    try:
        mp3 = urllib.request.urlopen(url, timeout=30).read()  # noqa: S310 (adresse fixe)
    except Exception:  # noqa: BLE001
        return None
    return subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "s16le", "pipe:1"],
        input=mp3,
        capture_output=True,
        check=True,
    ).stdout


def main() -> None:
    taches = [(r, s, v) for r in RECITATEURS for s, v in VERSETS]
    with ThreadPoolExecutor(8) as ex:
        sons = dict(zip(taches, ex.map(lambda t: telecharger(*t), taches)))
    sons = {t: a for t, a in sons.items() if a and len(a) / 32000 <= 30}
    print(f"{len(sons)} récitations ({len(VERSETS)} versets × {len(RECITATEURS)} récitateurs, ≤ 30 s)")
    for nom, reglages in CONFIGS:
        debut, mots, repris, par_regle, par_rec, durees = time.time(), 0, 0, Counter(), Counter(), []
        for (rec, s, v), a in sons.items():
            t = time.time()
            try:
                r = analyser(a, s, v, "hafs", reglages=reglages)
            except ErreurSaisie as e:
                print("  ignoré", rec, s, v, e)
                continue
            durees.append(time.time() - t)
            for m in r["mots"]:
                mots += 1
                regles = {n["regle"].split(":")[0] for n in m["remarques"]}
                if m["etat"] == "oublie":
                    regles.add("mot non entendu")
                if regles:
                    repris += 1
                    par_rec[rec] += 1
                    par_regle.update(regles)
        durees.sort()
        print(
            f"\n=== {nom} — {time.time() - debut:.0f} s, médiane {durees[len(durees) // 2]:.2f} s\n"
            f"  mots repris à tort : {repris}/{mots} ({100 * repris / max(1, mots):.1f} %)"
        )
        print("  par récitateur : " + ", ".join(f"{k} {c}" for k, c in par_rec.most_common()))
        print("  par règle : " + ", ".join(f"{k} {c}" for k, c in par_regle.most_common()))


if __name__ == "__main__":
    main()

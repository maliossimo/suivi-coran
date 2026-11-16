"""Banc d'essai sur des récitateurs de référence (everyayah.com) : des versets variés récités sans faute.
Toute remarque du moteur y est (presque sûrement) fausse : on mesure combien de mots sont repris à tort,
et par quelle règle, pour chaque réglage. Complète banc_qdat.py (un seul verset, mais des fautes annotées).

Warsh aussi : trois récitateurs Warsh d'everyayah.com (fichiers numérotés comme en Hafs) sur les versets dont
le découpage est le même dans les deux lectures. Idée tirée du travail de Yousr Allouani
(github.com/Yousr-Allah-Allouani/warsh-quran-audio) : mesurer avant tout, sur des récitations de référence,
ce que le moteur entend à tort en Warsh.

Usage (CI, réseau) : python tests_python/banc_recitateurs.py
"""

import json
import re

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
RECITATEURS_WARSH = [
    "warsh/warsh_ibrahim_aldosary_128kbps",
    "warsh/warsh_yassin_al_jazaery_64kbps",
    "warsh/warsh_Abdul_Basit_128kbps",
]
DONNEES = os.path.join(os.path.dirname(__file__), "..", "src", "donnees", "coran")

# Versets courts (≤ 30 s chez Husary), choisis pour couvrir les règles : madd (naturel, muttasil, munfasil,
# lazim, ʿarid), ghunna, ikhfaʾ, iqlab, idgham, qalqala, tafkhim…
VERSETS = (
    [(1, v) for v in range(1, 8)]
    + [(2, 2), (2, 5), (2, 1), (2, 6), (2, 7)]  # 2:6-7 : izhâr (سَوَآءٌ عَلَيۡهِمۡ, عَذَابٌ عَظِيمٌ)
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
    ("actuel (madd à l'horloge 1,25 / 3,5)", Reglages()),
    ("1.24 (sans horloge)", Reglages(madd_tenu=None, madd_trop_long=None)),
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


def versets_warsh() -> list[tuple[int, int, int, str]]:
    """Versets Warsh (sourate, verset Warsh, fichier Hafs, texte) découpés comme en Hafs : un fichier = un verset."""
    table = json.load(open(os.path.join(DONNEES, "warsh-hafs.json"), encoding="utf-8"))
    choisis = []
    for s, w in VERSETS:
        hafs = [i + 1 for i, ws in enumerate(table[str(s)]) if w in ws]
        if len(hafs) != 1 or table[str(s)][hafs[0] - 1] != [w]:
            continue
        textes = json.load(open(os.path.join(DONNEES, "warsh", f"{s}.json"), encoding="utf-8"))
        if w <= len(textes):
            choisis.append((s, w, hafs[0], re.sub(r"\s*[\u0660-\u0669]+\s*$", "", textes[w - 1]).strip()))
    return choisis


def main() -> None:
    lecture = sys.argv[1] if len(sys.argv) > 1 else "hafs"
    if lecture == "warsh":
        warsh = versets_warsh()
        taches = [(r, s, h) for r in RECITATEURS_WARSH for s, _, h, _ in warsh]
        lecteur = {(r, s, h): (w, t) for r in RECITATEURS_WARSH for s, w, h, t in warsh}
        nb_versets, nb_rec = len(warsh), len(RECITATEURS_WARSH)
    else:
        taches = [(r, s, v) for r in RECITATEURS for s, v in VERSETS]
        lecteur = {}
        nb_versets, nb_rec = len(VERSETS), len(RECITATEURS)
    with ThreadPoolExecutor(8) as ex:
        sons = dict(zip(taches, ex.map(lambda t: telecharger(*t), taches)))
    sons = {t: a for t, a in sons.items() if a and len(a) / 32000 <= 30}
    print(f"{lecture} : {len(sons)} récitations ({nb_versets} versets × {nb_rec} récitateurs, ≤ 30 s)")
    for nom, reglages in CONFIGS:
        debut, mots, repris, par_regle, par_rec, durees = time.time(), 0, 0, Counter(), Counter(), []
        oublis = []
        for (rec, s, v), a in sons.items():
            t = time.time()
            try:
                if lecture == "warsh":
                    w, texte = lecteur[(rec, s, v)]
                    r = analyser(a, s, w, "warsh", texte_warsh=texte, reglages=reglages)
                else:
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
                    oublis.append(f"{rec.split('/')[-1].split('_')[0 if lecture == 'hafs' else 1]} {s}:{v} « {m['mot']} »")
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
        if oublis:
            print("  mots non entendus : " + " ; ".join(oublis))


if __name__ == "__main__":
    main()

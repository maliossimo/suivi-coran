"""Moteur tajwid : une récitation d'un verset → des remarques mot par mot.

Modèle « HisnLabs Tajweed v2 » (Apache-2.0, https://huggingface.co/Hisnlabs/tajweed-v2) : il écrit ce qu'il entend
dans l'écriture phonétique du Coran ; le moteur de règles « imam.py » (même source) compare avec ce qu'une récitation
juste du verset doit donner et nomme chaque écart comme un enseignant. Repris de leur « inference.py ».

Rien n'est conservé : l'audio reste en mémoire le temps de l'analyse.
"""

import hashlib
import json
import os
import tempfile
import threading
import urllib.request
from functools import lru_cache

from dataclasses import dataclass

import numpy as np

from . import imam, warsh
from .mel import FeatureExtractor

ICI = os.path.dirname(os.path.abspath(__file__))
FREQ = 16_000
LEAD = int(FREQ * 0.4)  # les extraits d'entraînement commencent et finissent par un silence
DUREE_MIN, DUREE_MAX = 0.5, 30.0  # secondes (le modèle prend une phrase ou un verset, 30 s au plus)

# Modèle téléchargé au premier appel puis gardé en mémoire. Révision et empreintes figées :
# un fichier différent est refusé. « int8 » : 23 Mo ; « fp32 » : 83 Mo, le même sans compression.
REVISION = os.environ.get("TAJWID_REVISION", "b3b0503d32b4d9a8a0447880b4564fd3e9d69c15")
VARIANTES = {
    "int8": ("onnx/model-int8.onnx", "79cca1a2fc7ef81e325a3071a5f26cfec69203ef2c63177549065cdc1022c373"),
    "fp32": ("onnx/model-fp32.onnx", ""),
}
MODELE = os.environ.get("TAJWID_MODELE", "int8")


@dataclass(frozen=True)
class Reglages:
    """Réglages choisis sur le banc d'essai (159 apprenants annotés, tests_python/banc_qdat.py) :
    le modèle complet (fp32) n'y fait pas mieux que l'int8 ; des seuils de confiance 0,5 / 0,8 retirent
    un dixième des fausses remarques pour presque autant de fautes repérées ; la longueur du madd naturel
    y est plus souvent reprochée à tort qu'à raison : elle n'est pas jugée (un madd naturel oublié l'est)."""

    modele: str = MODELE
    min_prob: float = 0.5  # finesses de tajwid (madd, ghunna…) : tues si le modèle doute
    min_prob_jali: float = 0.8  # fautes nettes (lettre, voyelle, son)
    madd_naturel: bool = False  # juger la longueur du madd naturel (trop long / trop court)


REGLAGES = Reglages()

_verrou = threading.Lock()
_sessions: dict = {}
_meta = json.load(open(os.path.join(ICI, "config.json"), encoding="utf-8"))
_mel = FeatureExtractor(feature_size=80)


class ErreurSaisie(ValueError):
    """Requête invalide : message montrable à l'utilisateur."""


def _chemin_modele(variante: str = MODELE) -> str:
    fichier, empreinte = VARIANTES[variante]
    chemin = os.path.join(tempfile.gettempdir(), f"tajwid-{REVISION}-{variante}.onnx")
    if not os.path.exists(chemin):
        url = f"https://huggingface.co/Hisnlabs/tajweed-v2/resolve/{REVISION}/{fichier}"
        with urllib.request.urlopen(url, timeout=30) as r:  # noqa: S310 (adresse fixe)
            donnees = r.read()
        if empreinte and hashlib.sha256(donnees).hexdigest() != empreinte:
            raise RuntimeError("empreinte du modèle inattendue")
        tmp = chemin + ".part"
        with open(tmp, "wb") as f:
            f.write(donnees)
        os.replace(tmp, chemin)
    return chemin


def session(variante: str = MODELE):
    with _verrou:
        if variante not in _sessions:
            import onnxruntime as ort

            options = ort.SessionOptions()
            options.intra_op_num_threads = 2
            _sessions[variante] = ort.InferenceSession(
                _chemin_modele(variante), options, providers=["CPUExecutionProvider"]
            )
    return _sessions[variante]


def entendre(audio: np.ndarray, riwaya: str, variante: str = MODELE):
    """Ce que le modèle entend : écriture phonétique, confiance et instant (s) de chaque symbole."""
    audio = np.concatenate([np.zeros(LEAD, np.float32), audio.astype(np.float32), np.zeros(LEAD, np.float32)])
    mel = _mel(audio, padding=0)
    mel = mel[:, : min(3000, mel.shape[1] // 2 * 2)]
    lp = session(variante).run(
        None,
        {"mel": mel[None].astype(np.float32), "riwaya": np.array([_meta["riwayat"].index(riwaya)], np.int64)},
    )[0][0]
    ids, pas = lp.argmax(-1), len(audio) / FREQ / lp.shape[0]
    sortie, probs, instants, prec = [], [], [], 0
    for t, i in enumerate(ids):  # meilleur chemin CTC : blanc = 0, répétitions fusionnées
        if i != prec and i != 0:
            sortie.append(_meta["phonemes"][i - 1])
            probs.append(float(np.exp(lp[t, i])))
            instants.append((t + 0.5) * pas - LEAD / FREQ)
        prec = i
    derniers = [t for t, i in enumerate(ids) if i != 0]
    instants.append(((derniers[-1] + 1) * pas - LEAD / FREQ) if derniers else 0.0)
    return "".join(sortie), probs, instants


def mots_du_verset(sourate: int, verset: int, riwaya: str, texte_warsh: str | None) -> list[str]:
    from quran_transcript import Aya

    if riwaya == "hafs":
        return Aya(sourate, verset).get().uthmani.split(" ")
    if not texte_warsh:
        raise ErreurSaisie("Texte du verset manquant.")
    hafs = None
    if verset == 1 or (sourate, verset) == (42, 2):  # lettres séparées : lues comme en Hafs
        try:
            hafs = Aya(sourate, verset).get().uthmani.split(" ")
        except Exception:  # noqa: BLE001
            hafs = None
    return warsh.verse(sourate, verset, texte_warsh, hafs).split(" ")


MOTS_MAX = 400  # une page ou un peu plus
RECUL = 3  # l'élève peut reprendre quelques mots en arrière


@lru_cache(maxsize=64)
def _mots_passage(sourate: int, du: int, au: int, riwaya: str, textes: tuple[str, ...] | None):
    """Mots du passage, avec pour chacun son verset et sa place dans le verset."""
    mots, places = [], []
    for k, v in enumerate(range(du, au + 1)):
        texte = textes[k] if textes and k < len(textes) else None
        ms = mots_du_verset(sourate, v, riwaya, texte)
        mots += ms
        places += [(v, j) for j in range(len(ms))]
    return tuple(mots), tuple(places)


@lru_cache(maxsize=64)
def _reference(mots: tuple[str, ...], riwaya: str):
    """Écriture phonétique attendue du passage entier, et la place de chaque mot dans cette écriture."""
    ref = imam.expected(list(mots), riwaya=riwaya)
    return ref.phonemes, tuple(ref.spans)


def _situer(entendu: str, mots: tuple[str, ...], riwaya: str, depuis: int) -> tuple[int, int]:
    """Les mots [a, b) que couvre ce morceau : le départ près de « depuis » (l'élève peut reprendre un peu
    avant), la fin là où l'écriture attendue ressemble le plus à ce qui a été entendu."""
    ph, spans = _reference(mots, riwaya)
    n = len(mots)
    meilleur = (float("inf"), depuis, min(n, depuis + 1))
    for a in range(max(0, depuis - RECUL), min(n, depuis + 2)):
        debut = spans[a][0]
        for b in range(a + 1, n + 1):
            attendu = ph[debut : spans[b - 1][1]]
            if len(attendu) > 2 * len(entendu) + 20:
                break
            d = imam.Levenshtein.distance(attendu, entendu) + 0.5 * abs(a - depuis)
            if d < meilleur[0]:
                meilleur = (d, a, b)
    return meilleur[1], meilleur[2]


def _etat(notes: list) -> str:
    if any(n["rule"] == "word" for n in notes):
        return "oublie"
    if any(n["severity"] == "jali" for n in notes):
        return "erreur"
    return "a_revoir" if notes else "juste"


def _lire_audio(pcm: bytes) -> np.ndarray:
    if len(pcm) % 2:
        raise ErreurSaisie("Audio invalide.")
    audio = np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
    duree = len(audio) / FREQ
    if duree < DUREE_MIN:
        raise ErreurSaisie("Récitation trop courte.")
    if duree > DUREE_MAX + 0.5:
        raise ErreurSaisie("30 secondes au plus par morceau.")
    return audio


def analyser_passage(
    pcm: bytes,
    sourate: int,
    du: int,
    au: int,
    riwaya: str,
    textes_warsh: list[str] | None = None,
    depuis: int = 0,
    tempo: list[float] | None = None,
    reglages: Reglages = REGLAGES,
    avec_passage: bool = False,
) -> dict:
    """Un morceau (≤ 30 s) d'une récitation des versets du..au : il est situé dans le passage, à partir du mot
    « depuis », puis jugé mot par mot. tempo : les madd naturels déjà entendus dans la séance (le rythme de
    l'élève), rendus complétés pour le morceau suivant."""
    if riwaya not in ("hafs", "warsh"):
        raise ErreurSaisie("Lecture inconnue.")
    if not (1 <= sourate <= 114) or du < 1 or au < du or au - du > 40:
        raise ErreurSaisie("Verset inconnu.")
    audio = _lire_audio(pcm)
    try:
        mots, places = _mots_passage(sourate, du, au, riwaya, tuple(textes_warsh) if textes_warsh else None)
    except ErreurSaisie:
        raise
    except Exception as e:  # noqa: BLE001
        raise ErreurSaisie("Verset inconnu.") from e
    if len(mots) > MOTS_MAX:
        raise ErreurSaisie("Passage trop long : choisis moins de versets.")
    depuis = max(0, min(depuis, len(mots) - 1))
    tempo = [float(t) for t in (tempo or []) if isinstance(t, (int, float)) and 0.05 < t < 3][-40:]

    passage = [[v, p, w] for (v, p), w in zip(places, mots)] if avec_passage else None
    entendu, probs, instants = entendre(audio, riwaya, reglages.modele)
    if not entendu:
        return {"entendu": "", "mots": [], "couverts": [depuis, depuis], "tempo": tempo, "passage": passage}

    a, b = _situer(entendu, mots, riwaya, depuis)
    ref = imam.recited(list(mots[a:b]), entendu, riwaya=riwaya)
    bornes = imam._boundaries(ref.phonemes, entendu)
    resultat = []
    for k, m in enumerate(
        imam.listen(
            ref,
            entendu,
            heard_probs=probs,
            min_prob=reglages.min_prob,
            min_prob_jali=reglages.min_prob_jali,
            langs=("fr",),
            heard_times=instants,
            tempo=tempo,
        )
    ):
        notes = [
            n
            for n in m["notes"]
            if reglages.madd_naturel or not (n["rule"] == "NormalMaddRule" and n["severity"] == "khafi")
        ]
        g = a + m["index"]
        s0, s1 = ref.spans[k]
        h0, h1 = bornes[s0], bornes[s1]
        resultat.append(
            {
                "verset": places[g][0],
                "place": places[g][1],
                "indice": g,
                "mot": m["word"],
                "etat": _etat(notes),
                "remarques": [{"gravite": n["severity"], "regle": n["rule"], "texte": n["msg"]["fr"]} for n in notes],
                "madd": [{"nom": d["name"]["fr"], "temps": d["heard"]} for d in m["madd"]],
                # où entendre ce mot dans le morceau (secondes)
                "debut": round(max(0.0, instants[min(h0, len(instants) - 1)] - 0.15), 2),
                "fin": round(instants[min(max(h1, h0 + 1), len(instants) - 1)] + 0.1, 2),
            }
        )
    return {"entendu": entendu, "mots": resultat, "couverts": [a, b], "tempo": tempo, "passage": passage}


def analyser(
    pcm: bytes,
    sourate: int,
    verset: int,
    riwaya: str,
    texte_warsh: str | None = None,
    reglages: Reglages = REGLAGES,
) -> dict:
    """Un verset entier ; les mots non entendus sont marqués oubliés."""
    if not (1 <= sourate <= 114) or verset < 1:
        raise ErreurSaisie("Verset inconnu.")
    r = analyser_passage(
        pcm, sourate, verset, verset, riwaya, [texte_warsh] if texte_warsh else None, reglages=reglages
    )
    mots, _ = _mots_passage(sourate, verset, verset, riwaya, (texte_warsh,) if texte_warsh else None)
    vus = {m["indice"]: m for m in r["mots"]}
    r["mots"] = [
        vus.get(i, {"verset": verset, "place": i, "indice": i, "mot": w, "etat": "oublie", "remarques": [], "madd": []})
        for i, w in enumerate(mots)
    ]
    return r

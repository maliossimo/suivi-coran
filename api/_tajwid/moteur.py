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
    y est plus souvent reprochée à tort qu'à raison : elle n'est pas jugée (un madd naturel oublié l'est).
    La double écoute (int8 + fp32, remarque gardée si les deux la font) avec des seuils 0,3 / 0,7 fait
    mieux sur les deux tableaux : 65 fausses remarques sur 868 mots justes (au lieu de 73) et 87 fautes
    repérées (au lieu de 81), pour ~0,3 s par morceau au lieu de ~0,1 s : retenue (précision d'abord)."""

    modele: str = MODELE
    min_prob: float = 0.3  # finesses de tajwid (madd, ghunna…) : tues si le modèle doute
    min_prob_jali: float = 0.7  # fautes nettes (lettre, voyelle, son)
    madd_naturel: bool = False  # juger la longueur du madd naturel (trop long / trop court)
    # Double écoute : le morceau est aussi écouté par l'autre version du modèle, et une remarque
    # n'est gardée que si les deux la font (moins de remarques fausses ou changeantes).
    consensus: bool = True
    # Madd naturel mesuré à l'horloge (voir _mesurer_madds) : None = pas de mesure. Un « madd oublié »
    # tenu au moins `madd_long` temps n'est pas reproché ; un madd tenu moins de `madd_court` temps l'est.
    madd_long: float | None = None
    madd_court: float | None = None


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


def _situer(
    entendu: str, mots: tuple[str, ...], riwaya: str, depuis: int, recul: int = RECUL, ecart: float = 0.5
) -> tuple[int, int]:
    """Les mots [a, b) que couvre ce morceau : le départ près de « depuis » (l'élève peut reprendre un peu
    avant), la fin là où l'écriture attendue ressemble le plus à ce qui a été entendu."""
    ph, spans = _reference(mots, riwaya)
    n = len(mots)
    meilleur = (float("inf"), depuis, min(n, depuis + 1))
    for a in range(max(0, depuis - recul), min(n, depuis + 2)):
        debut = spans[a][0]
        for b in range(a + 1, n + 1):
            attendu = ph[debut : spans[b - 1][1]]
            if len(attendu) > 2 * len(entendu) + 20:
                break
            d = imam.Levenshtein.distance(attendu, entendu) + ecart * abs(a - depuis)
            if d < meilleur[0]:
                meilleur = (d, a, b)
    return meilleur[1], meilleur[2]


def _mesurer_madds(ref, entendu: str, bornes: list[int], instants: list[float]) -> dict[int, list[dict]]:
    """Chaque madd naturel du morceau, mesuré à l'horloge : sa durée rapportée à celle d'une voyelle brève
    de la même personne dans le même morceau (1 temps). Le modèle écrit parfois une voyelle allongée sans
    son signe de madd (ou l'inverse) : l'horloge départage. → {mot du morceau : [{symboles, temps}]}"""
    if not instants or len(instants) != len(entendu) + 1:
        return {}
    longues = set(imam.LONG)
    breves = sorted(
        d
        for k in range(len(entendu) - 1)
        if entendu[k] in imam.HARAKAT and entendu[k + 1] not in longues
        for d in [instants[k + 1] - instants[k]]
        if 0.02 < d < 0.6
    )
    if len(breves) < 3:
        return {}
    breve = breves[len(breves) // 2]
    fins = set(ref.ends or [len(ref.words) - 1])
    mesures: dict[int, list[dict]] = {}
    for u in ref.units:
        if u.kind != "madd" or u.rule != "NormalMaddRule" or u.word in fins:
            continue  # en fin de souffle, le madd peut être tenu comme ʿarid
        hs, he = bornes[u.s], bornes[u.e]
        n, rs, re_ = imam._run(entendu, max(0, hs - 1), min(len(entendu), he + 1), u.char)
        if n:
            duree = imam._dur(entendu, instants, rs, re_)
        else:  # pas de signe de madd : la voyelle brève entendue à cet endroit
            ks = [k for k in range(max(0, hs - 2), min(len(entendu), he + 1)) if entendu[k] in imam.HARAKAT]
            if not ks:
                continue
            duree = instants[ks[-1] + 1] - instants[ks[-1]]
        mesures.setdefault(u.word, []).append({"pos": u.s, "symboles": n, "temps": round(duree / breve, 2)})
    return mesures


def _madd_tenu(note: dict, mesures: list[dict] | None, reglages: Reglages) -> bool:
    """Un « madd naturel oublié » alors que l'horloge dit que la voyelle a bien été tenue : remarque retirée."""
    if reglages.madd_long is None or note["rule"] != "NormalMaddRule" or note["heard"] != 0 or not mesures:
        return False
    return any(m["pos"] == note.get("pos") and m["symboles"] == 0 and m["temps"] >= reglages.madd_long for m in mesures)


def _madd_trop_court(notes: list, mesures: list[dict] | None, reglages: Reglages) -> dict | None:
    """Un madd naturel écrit par le modèle mais tenu nettement moins de 2 temps à l'horloge."""
    if reglages.madd_court is None or not mesures or any(n["rule"] == "NormalMaddRule" for n in notes):
        return None
    courts = [m["temps"] for m in mesures if m["symboles"] > 0 and m["temps"] < reglages.madd_court]
    if not courts:
        return None
    return {
        "rule": "NormalMaddRule",
        "severity": "khafi",
        "expected": [2],
        "heard": 1,
        "msg": {"fr": "Madd naturel trop court : tiens la voyelle 2 temps"},
    }


def _etat(notes: list) -> str:
    if any(n["rule"] == "word" for n in notes):
        return "oublie"
    if any(n["severity"] == "jali" for n in notes):
        return "erreur"
    return "a_revoir" if notes else "juste"


def _mulaw(octets: bytes) -> np.ndarray:
    """μ-law 8 bits (G.711) → échantillons entre -1 et 1 : deux fois moins lourd à envoyer (suivi en direct)."""
    u = ~np.frombuffer(octets, np.uint8)
    signe = (u & 0x80) != 0
    exposant = (u >> 4) & 0x07
    mantisse = u & 0x0F
    v = ((mantisse.astype(np.int32) << 3) + 0x84) << exposant
    v = (v - 0x84).astype(np.float32) / 32768
    return np.where(signe, -v, v)


def _lire_audio(pcm: bytes, format_audio: str = "pcm") -> np.ndarray:
    if format_audio == "mulaw":
        audio = _mulaw(pcm)
    elif len(pcm) % 2:
        raise ErreurSaisie("Audio invalide.")
    else:
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
    diagnostic: bool = False,
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
    confirmees = None
    if reglages.consensus:
        autre = "fp32" if reglages.modele == "int8" else "int8"
        entendu2, probs2, instants2 = entendre(audio, riwaya, autre)
        confirmees = set()
        if entendu2:
            ref2 = imam.recited(list(mots[a:b]), entendu2, riwaya=riwaya)
            for m2 in imam.listen(
                ref2,
                entendu2,
                heard_probs=probs2,
                min_prob=reglages.min_prob,
                min_prob_jali=reglages.min_prob_jali,
                langs=("fr",),
                heard_times=instants2,
                tempo=list(tempo),
            ):
                confirmees |= {(a + m2["index"], n["rule"].split(":")[0]) for n in m2["notes"]}
    ref = imam.recited(list(mots[a:b]), entendu, riwaya=riwaya)
    bornes = imam._boundaries(ref.phonemes, entendu)
    mesures = _mesurer_madds(ref, entendu, bornes, instants)
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
        g = a + m["index"]
        notes = [
            n
            for n in m["notes"]
            if (reglages.madd_naturel or not (n["rule"] == "NormalMaddRule" and n["severity"] == "khafi"))
            and (confirmees is None or (g, n["rule"].split(":")[0]) in confirmees)
            and not _madd_tenu(n, mesures.get(k), reglages)
        ]
        trop_court = _madd_trop_court(notes, mesures.get(k), reglages)
        if trop_court:
            notes.append(trop_court)
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
                **({"mesures_madd": mesures.get(k, [])} if diagnostic else {}),
            }
        )
    return {"entendu": entendu, "mots": resultat, "couverts": [a, b], "tempo": tempo, "passage": passage}


def suivre(
    son: bytes,
    sourate: int,
    du: int,
    au: int,
    riwaya: str,
    textes_warsh: list[str] | None = None,
    depuis: int = 0,
    avec_passage: bool = False,
) -> dict:
    """Suivi en direct : les dernières secondes récitées (μ-law), seulement situées dans le passage
    (jusqu'où l'élève est arrivé), sans jugement — celui-ci vient à la pause, sur le morceau entier."""
    if riwaya not in ("hafs", "warsh"):
        raise ErreurSaisie("Lecture inconnue.")
    if not (1 <= sourate <= 114) or du < 1 or au < du or au - du > 40:
        raise ErreurSaisie("Verset inconnu.")
    audio = _lire_audio(son, "mulaw")
    mots, places = _mots_passage(sourate, du, au, riwaya, tuple(textes_warsh) if textes_warsh else None)
    passage = [[v, p, w] for (v, p), w in zip(places, mots)] if avec_passage else None
    entendu, _, _ = entendre(audio, riwaya)
    if len(entendu) < 4:
        return {"couverts": [depuis, depuis], "passage": passage}
    depuis = max(0, min(depuis, len(mots) - 1))
    a, b = _situer(entendu, mots, riwaya, depuis, recul=25, ecart=0.15)
    return {"couverts": [a, b], "passage": passage}


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

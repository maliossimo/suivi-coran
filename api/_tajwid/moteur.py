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

import numpy as np

from . import imam, warsh
from .mel import FeatureExtractor

ICI = os.path.dirname(os.path.abspath(__file__))
FREQ = 16_000
LEAD = int(FREQ * 0.4)  # les extraits d'entraînement commencent et finissent par un silence
DUREE_MIN, DUREE_MAX = 0.5, 30.0  # secondes (le modèle prend une phrase ou un verset, 30 s au plus)

# Modèle int8 (23 Mo), téléchargé au premier appel puis gardé en mémoire. Révision et empreinte figées :
# un fichier différent est refusé.
REVISION = os.environ.get("TAJWID_REVISION", "b3b0503d32b4d9a8a0447880b4564fd3e9d69c15")
EMPREINTE = os.environ.get(
    "TAJWID_SHA256", "79cca1a2fc7ef81e325a3071a5f26cfec69203ef2c63177549065cdc1022c373"
)
URL_MODELE = f"https://huggingface.co/Hisnlabs/tajweed-v2/resolve/{REVISION}/onnx/model-int8.onnx"

_verrou = threading.Lock()
_session = None
_meta = json.load(open(os.path.join(ICI, "config.json"), encoding="utf-8"))
_mel = FeatureExtractor(feature_size=80)


class ErreurSaisie(ValueError):
    """Requête invalide : message montrable à l'utilisateur."""


def _chemin_modele() -> str:
    chemin = os.path.join(tempfile.gettempdir(), f"tajwid-{REVISION}.onnx")
    if not os.path.exists(chemin):
        with urllib.request.urlopen(URL_MODELE, timeout=20) as r:  # noqa: S310 (adresse fixe)
            donnees = r.read()
        if EMPREINTE and hashlib.sha256(donnees).hexdigest() != EMPREINTE:
            raise RuntimeError("empreinte du modèle inattendue")
        tmp = chemin + ".part"
        with open(tmp, "wb") as f:
            f.write(donnees)
        os.replace(tmp, chemin)
    return chemin


def session():
    global _session
    with _verrou:
        if _session is None:
            import onnxruntime as ort

            options = ort.SessionOptions()
            options.intra_op_num_threads = 2
            _session = ort.InferenceSession(_chemin_modele(), options, providers=["CPUExecutionProvider"])
    return _session


def entendre(audio: np.ndarray, riwaya: str):
    """Ce que le modèle entend : écriture phonétique, confiance et instant (s) de chaque symbole."""
    audio = np.concatenate([np.zeros(LEAD, np.float32), audio.astype(np.float32), np.zeros(LEAD, np.float32)])
    mel = _mel(audio, padding=0)
    mel = mel[:, : min(3000, mel.shape[1] // 2 * 2)]
    lp = session().run(
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


def analyser(pcm: bytes, sourate: int, verset: int, riwaya: str, texte_warsh: str | None = None) -> dict:
    """pcm : 16 kHz, mono, 16 bits (petit-boutiste). Renvoie les mots avec leurs remarques en français."""
    if riwaya not in ("hafs", "warsh"):
        raise ErreurSaisie("Lecture inconnue.")
    if not (1 <= sourate <= 114) or verset < 1:
        raise ErreurSaisie("Verset inconnu.")
    if len(pcm) % 2:
        raise ErreurSaisie("Audio invalide.")
    audio = np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
    duree = len(audio) / FREQ
    if duree < DUREE_MIN:
        raise ErreurSaisie("Récitation trop courte.")
    if duree > DUREE_MAX + 0.5:
        raise ErreurSaisie("30 secondes au plus : récite un verset à la fois.")

    try:
        mots = mots_du_verset(sourate, verset, riwaya, texte_warsh)
    except ErreurSaisie:
        raise
    except Exception as e:  # noqa: BLE001
        raise ErreurSaisie("Verset inconnu.") from e

    entendu, probs, instants = entendre(audio, riwaya)
    if not entendu:
        return {"entendu": "", "mots": [{"mot": m, "etat": "oublie", "remarques": [], "madd": []} for m in mots]}

    ref = imam.recited(mots, entendu, riwaya=riwaya)
    resultat = []
    for m in imam.listen(
        ref, entendu, heard_probs=probs, min_prob=0.3, min_prob_jali=0.7, langs=("fr",), heard_times=instants
    ):
        notes = m["notes"]
        if any(n["rule"] == "word" for n in notes):
            etat = "oublie"
        elif any(n["severity"] == "jali" for n in notes):
            etat = "erreur"
        elif notes:
            etat = "a_revoir"
        else:
            etat = "juste"
        resultat.append(
            {
                "mot": m["word"],
                "etat": etat,
                "remarques": [{"gravite": n["severity"], "texte": n["msg"]["fr"]} for n in notes],
                "madd": [{"nom": d["name"]["fr"], "temps": d["heard"]} for d in m["madd"]],
            }
        )
    return {"entendu": entendu, "mots": resultat}

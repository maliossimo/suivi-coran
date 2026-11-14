# Moteur tajwid

Analyse d'une récitation d'un verset, mot par mot (fonction Python `api/moteur_tajwid.py`).

| Fichier | Origine | Licence |
|---|---|---|
| `imam.py`, `warsh.py`, `config.json` | [HisnLabs/tajweed](https://github.com/HisnLabs/tajweed) (commit 74cd9f5), copiés sans modification | Apache-2.0 (`LICENSE-HisnLabs-Apache-2.0`) |
| `mel.py` | `faster_whisper/feature_extractor.py` de [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper), copié sans modification | MIT (`LICENSE-faster-whisper-MIT`) |
| modèle `onnx/model-int8.onnx` | [Hisnlabs/tajweed-v2](https://huggingface.co/Hisnlabs/tajweed-v2), téléchargé au premier appel | Apache-2.0 |
| `moteur.py`, `jeton.py` | ce dépôt | — |

Le moteur s'appuie aussi sur `quran-transcript` (MIT) pour l'écriture phonétique du Coran.

Rien n'est conservé : l'audio reste en mémoire le temps de l'analyse.

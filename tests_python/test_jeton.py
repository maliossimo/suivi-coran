"""Jetons d'accès au moteur : même format que src/lib/tajwid.ts."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "cle-de-test-pour-les-jetons-0123456789"

from _tajwid import jeton  # noqa: E402

# Produit par signerJetonTajwid (Node) avec la même clé, pour l'utilisateur ci-dessous, expiration 1800000300.
JETON_NODE = (
    "eyJ1IjoiZTJlMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMGFkIiwiZXhwIjoxODAwMDAwMzAwfQ"
    ".6fa0057535c11a6be5cee9d545ccff207871a76301491e428e13a9e103dd6285"
)
UTILISATEUR = "e2e00000-0000-0000-0000-0000000000ad"


def test_accepte_un_jeton_de_l_appli():
    assert jeton.verifier(JETON_NODE, 1800000000) == UTILISATEUR


def test_refuse_un_jeton_expire():
    assert jeton.verifier(JETON_NODE, 1800000301) is None


def test_refuse_un_jeton_trop_long():
    assert jeton.verifier(JETON_NODE, 1800000300 - 601) is None


def test_refuse_une_signature_modifiee():
    assert jeton.verifier(JETON_NODE[:-1] + ("0" if JETON_NODE[-1] != "0" else "1"), 1800000000) is None


def test_refuse_sans_cle(monkeypatch):
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    assert jeton.verifier(JETON_NODE, 1800000000) is None


def test_refuse_n_importe_quoi():
    for valeur in ["", "abc", "a.b.c", "!!!.zz"]:
        assert jeton.verifier(valeur, 1800000000) is None

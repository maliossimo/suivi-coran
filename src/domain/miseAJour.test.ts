import { describe, expect, it } from "vitest";
import {
  erreurDeVersion,
  INACTIVITE_AVANT_RECHARGEMENT,
  nouvelleVersion,
  rechargementSansGene,
} from "./miseAJour";

describe("mise à jour automatique", () => {
  it("repère un autre déploiement", () => {
    expect(nouvelleVersion("abc1234", "def5678")).toBe(true);
    expect(nouvelleVersion("abc1234", "abc1234")).toBe(false);
    // Développement ou tests (pas de numéro) : jamais de rechargement.
    expect(nouvelleVersion(null, "def5678")).toBe(false);
    expect(nouvelleVersion("abc1234", null)).toBe(false);
  });

  const calme = {
    visible: true,
    feuilleOuverte: false,
    sonEnCours: false,
    saisieEnCours: false,
    inactifDepuis: INACTIVITE_AVANT_RECHARGEMENT,
  };
  it("recharge quand personne n'est gêné", () => {
    expect(rechargementSansGene(calme)).toBe(true);
  });
  it("attend pendant une saisie, une écoute, une feuille ouverte ou un geste récent", () => {
    expect(rechargementSansGene({ ...calme, saisieEnCours: true })).toBe(false);
    expect(rechargementSansGene({ ...calme, sonEnCours: true })).toBe(false);
    expect(rechargementSansGene({ ...calme, feuilleOuverte: true })).toBe(false);
    expect(rechargementSansGene({ ...calme, inactifDepuis: 3_000 })).toBe(false);
    expect(rechargementSansGene({ ...calme, visible: false })).toBe(false);
  });
});

describe("erreurDeVersion", () => {
  it("reconnaît un décalage entre l'appli ouverte et la version en ligne", () => {
    expect(erreurDeVersion("TypeError", "e[o] is not a function")).toBe(true);
    expect(erreurDeVersion("ChunkLoadError", "Loading chunk 123 failed.")).toBe(true);
    expect(erreurDeVersion("Error", "Loading chunk app/admin/coran/page failed.")).toBe(true);
    expect(erreurDeVersion("TypeError", "Cannot read properties of undefined (reading 'call')")).toBe(true);
    expect(erreurDeVersion("TypeError", "Failed to fetch dynamically imported module: /x.js")).toBe(true);
  });

  it("laisse passer les vraies erreurs", () => {
    expect(erreurDeVersion("TypeError", "onTaille is not a function")).toBe(false);
    expect(erreurDeVersion("Error", "Séance introuvable")).toBe(false);
  });
});

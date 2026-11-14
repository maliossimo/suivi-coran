/**
 * Résultat de l'analyse tajwid d'une récitation (moteur « api/moteur_tajwid.py ») :
 * types, validation de la réponse et bilan affiché.
 */

export type EtatMot = "juste" | "a_revoir" | "erreur" | "oublie";

export interface Remarque {
  /** « jali » : faute nette (lettre, voyelle, mot) ; « khafi » : finesse de tajwid (madd, ghunna…). */
  gravite: "jali" | "khafi";
  texte: string;
}

export interface MotAnalyse {
  mot: string;
  etat: EtatMot;
  remarques: Remarque[];
  /** Madd entendus (hors madd naturel) : nom et durée en temps. */
  madd: { nom: string; temps: number }[];
}

export interface AnalyseTajwid {
  entendu: string;
  mots: MotAnalyse[];
}

export const LIBELLE_ETAT: Record<EtatMot, string> = {
  juste: "Juste",
  a_revoir: "À revoir",
  erreur: "Erreur",
  oublie: "Oublié",
};

const ETATS = new Set<string>(Object.keys(LIBELLE_ETAT));

const estTexte = (v: unknown): v is string => typeof v === "string";

/** Lit la réponse du moteur ; null si elle n'a pas la forme attendue. */
export function lireAnalyse(brut: unknown): AnalyseTajwid | null {
  if (!brut || typeof brut !== "object") return null;
  const { entendu, mots } = brut as { entendu?: unknown; mots?: unknown };
  if (!estTexte(entendu) || !Array.isArray(mots)) return null;
  const lus: MotAnalyse[] = [];
  for (const m of mots) {
    if (!m || typeof m !== "object") return null;
    const { mot, etat, remarques, madd } = m as Record<string, unknown>;
    if (!estTexte(mot) || !estTexte(etat) || !ETATS.has(etat)) return null;
    lus.push({
      mot,
      etat: etat as EtatMot,
      remarques: Array.isArray(remarques)
        ? remarques
            .filter(
              (r): r is { gravite: string; texte: string } => estTexte(r?.texte) && estTexte(r?.gravite),
            )
            .map((r) => ({ gravite: r.gravite === "jali" ? "jali" : "khafi", texte: r.texte }))
        : [],
      madd: Array.isArray(madd)
        ? madd
            .filter(
              (d): d is { nom: string; temps: number } => estTexte(d?.nom) && typeof d?.temps === "number",
            )
            .map((d) => ({ nom: d.nom, temps: d.temps }))
        : [],
    });
  }
  return { entendu, mots: lus };
}

export interface Bilan {
  total: number;
  /** Part des mots justes, de 0 à 100. */
  score: number;
  compte: Record<EtatMot, number>;
}

export function bilanTajwid(mots: readonly MotAnalyse[]): Bilan {
  const compte: Record<EtatMot, number> = { juste: 0, a_revoir: 0, erreur: 0, oublie: 0 };
  for (const m of mots) compte[m.etat]++;
  return {
    total: mots.length,
    score: mots.length ? Math.round((compte.juste / mots.length) * 100) : 0,
    compte,
  };
}

/** Le mot à montrer d'abord : la première faute nette, sinon la première remarque. */
export function premierMotARevoir(mots: readonly MotAnalyse[]): number | null {
  const ordre: EtatMot[] = ["erreur", "oublie", "a_revoir"];
  for (const etat of ordre) {
    const i = mots.findIndex((m) => m.etat === etat);
    if (i >= 0) return i;
  }
  return null;
}

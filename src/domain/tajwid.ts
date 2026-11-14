/**
 * Résultat de l'analyse tajwid d'une récitation (moteur « api/moteur_tajwid.py ») :
 * types, validation de la réponse et bilan affiché.
 */

export type EtatMot = "juste" | "a_revoir" | "erreur" | "oublie";
/** Pour l'affichage d'un passage : un mot que l'élève n'a pas (encore) récité. */
export type EtatAffiche = EtatMot | "non_recite";

export interface Remarque {
  /** « jali » : faute nette (lettre, voyelle, mot) ; « khafi » : finesse de tajwid (madd, ghunna…). */
  gravite: "jali" | "khafi";
  /** Règle en cause (pour « L'appli s'est trompée »). */
  regle: string;
  texte: string;
}

export interface MotAnalyse {
  mot: string;
  etat: EtatMot;
  remarques: Remarque[];
  /** Madd entendus (hors madd naturel) : nom et durée en temps. */
  madd: { nom: string; temps: number }[];
  /** Place dans le passage (verset, rang dans le verset, rang dans le passage). */
  verset?: number;
  place?: number;
  indice?: number;
  /** Où entendre ce mot dans le morceau envoyé (secondes). */
  debut?: number;
  fin?: number;
}

export interface AnalyseTajwid {
  entendu: string;
  mots: MotAnalyse[];
  /** Mots du passage couverts par ce morceau : [premier, après le dernier). */
  couverts?: [number, number];
  /** Rythme de l'élève, à renvoyer avec le morceau suivant. */
  tempo?: number[];
  /** Tous les mots du passage : [verset, rang, mot] (premier morceau). */
  passage?: [number, number, string][];
}

export const LIBELLE_ETAT: Record<EtatMot, string> = {
  juste: "Juste",
  a_revoir: "À revoir",
  erreur: "Erreur",
  oublie: "Oublié",
};

const ETATS = new Set<string>(Object.keys(LIBELLE_ETAT));

const estTexte = (v: unknown): v is string => typeof v === "string";
const estNombre = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const nombre = (v: unknown): number | undefined => (estNombre(v) ? v : undefined);

/** Lit la réponse du moteur ; null si elle n'a pas la forme attendue. */
export function lireAnalyse(brut: unknown): AnalyseTajwid | null {
  if (!brut || typeof brut !== "object") return null;
  const { entendu, mots, couverts, tempo, passage } = brut as Record<string, unknown>;
  if (!estTexte(entendu) || !Array.isArray(mots)) return null;
  const lus: MotAnalyse[] = [];
  for (const m of mots) {
    if (!m || typeof m !== "object") return null;
    const { mot, etat, remarques, madd, verset, place, indice, debut, fin } = m as Record<string, unknown>;
    if (!estTexte(mot) || !estTexte(etat) || !ETATS.has(etat)) return null;
    lus.push({
      mot,
      etat: etat as EtatMot,
      verset: nombre(verset),
      place: nombre(place),
      indice: nombre(indice),
      debut: nombre(debut),
      fin: nombre(fin),
      remarques: Array.isArray(remarques)
        ? remarques
            .filter(
              (r): r is { gravite: string; regle?: unknown; texte: string } =>
                estTexte(r?.texte) && estTexte(r?.gravite),
            )
            .map((r) => ({
              gravite: r.gravite === "jali" ? "jali" : "khafi",
              regle: estTexte(r.regle) ? r.regle : "",
              texte: r.texte,
            }))
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
  const lu: AnalyseTajwid = { entendu, mots: lus };
  if (Array.isArray(couverts) && couverts.length === 2 && couverts.every(estNombre)) {
    lu.couverts = [couverts[0] as number, couverts[1] as number];
  }
  if (Array.isArray(tempo)) lu.tempo = tempo.filter(estNombre).slice(-40);
  if (Array.isArray(passage)) {
    lu.passage = passage.filter(
      (p): p is [number, number, string] =>
        Array.isArray(p) && p.length === 3 && estNombre(p[0]) && estNombre(p[1]) && estTexte(p[2]),
    );
  }
  return lu;
}

export interface MotDuPassage {
  indice: number;
  verset: number;
  mot: string;
  etat: EtatAffiche;
  analyse?: MotAnalyse;
  /** Morceau où le mot a été entendu (pour le réécouter). */
  morceau?: number;
}

/**
 * Le passage tel qu'affiché : chaque mot avec son dernier résultat (le morceau le plus récent l'emporte,
 * l'élève a pu reprendre). Un mot jamais entendu avant le dernier mot récité est « oublié » ;
 * après, il n'a simplement pas été récité.
 */
export function assemblerPassage(
  passage: readonly [number, number, string][],
  morceaux: readonly (readonly MotAnalyse[])[],
): MotDuPassage[] {
  const vus = new Map<number, { analyse: MotAnalyse; morceau: number }>();
  morceaux.forEach((mots, morceau) => {
    for (const m of mots) if (m.indice !== undefined) vus.set(m.indice, { analyse: m, morceau });
  });
  const dernier = Math.max(-1, ...vus.keys());
  return passage.map(([verset, , mot], indice) => {
    const vu = vus.get(indice);
    if (vu) {
      return {
        indice,
        verset,
        mot: vu.analyse.mot,
        etat: vu.analyse.etat,
        analyse: vu.analyse,
        morceau: vu.morceau,
      };
    }
    return { indice, verset, mot, etat: indice < dernier ? "oublie" : "non_recite" };
  });
}

/** Bilan d'un passage : seuls les mots récités (jusqu'au dernier) comptent. */
export function bilanPassage(mots: readonly MotDuPassage[]): Bilan {
  return bilanTajwid(
    mots
      .filter((m) => m.etat !== "non_recite")
      .map((m) => ({ mot: m.mot, etat: m.etat as EtatMot, remarques: [], madd: [] })),
  );
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

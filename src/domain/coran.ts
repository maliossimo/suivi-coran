/**
 * Règles pures de la lecture du Coran : tajwid en couleur et récitation verset par verset.
 */

/** Codes des règles de tajwid dans les données (src/donnees/coran/tajwid). */
export const CODES_TAJWID = [
  "h",
  "l",
  "e",
  "o",
  "m",
  "t",
  "s",
  "x",
  "g",
  "k",
  "w",
  "d",
  "n",
  "f",
  "j",
  "b",
  "i",
  "q",
] as const;
export type CodeTajwid = (typeof CODES_TAJWID)[number];

/** Un morceau de verset : texte simple, ou [règle, texte] à colorer. */
export type SegmentTajwid = string | [CodeTajwid, string];

/** Familles de règles, chacune avec sa couleur (légende affichée sous le texte). */
export interface FamilleTajwid {
  cle: string;
  libelle: string;
  arabe: string;
  codes: readonly CodeTajwid[];
}

export const FAMILLES_TAJWID: readonly FamilleTajwid[] = [
  { cle: "madd-2", libelle: "Madd naturel (2 temps)", arabe: "مد طبيعي", codes: ["o"] },
  { cle: "madd-246", libelle: "Madd facultatif (2, 4 ou 6)", arabe: "مد جائز", codes: ["m"] },
  { cle: "madd-45", libelle: "Madd obligatoire / séparé (4-5)", arabe: "مد واجب ومنفصل", codes: ["t", "s"] },
  { cle: "madd-6", libelle: "Madd nécessaire (6 temps)", arabe: "مد لازم", codes: ["x"] },
  { cle: "ghunna", libelle: "Ghunna", arabe: "غنة", codes: ["g"] },
  { cle: "ikhfa", libelle: "Ikhfâ'", arabe: "إخفاء", codes: ["k", "w"] },
  { cle: "idgham", libelle: "Idghâm avec ghunna", arabe: "إدغام بغنة", codes: ["d", "f"] },
  { cle: "idgham-sans", libelle: "Idghâm sans ghunna", arabe: "إدغام بلا غنة", codes: ["n", "j", "b"] },
  { cle: "iqlab", libelle: "Iqlâb", arabe: "إقلاب", codes: ["i"] },
  { cle: "qalqala", libelle: "Qalqala", arabe: "قلقلة", codes: ["q"] },
  { cle: "muette", libelle: "Lettre non prononcée", arabe: "لا يُلفظ", codes: ["h", "l", "e"] },
];

const FAMILLE_PAR_CODE = new Map<string, string>(
  FAMILLES_TAJWID.flatMap((f) => f.codes.map((c) => [c, f.cle] as const)),
);

/** Famille (et donc couleur) d'une règle ; null si le code est inconnu. */
export function familleTajwid(code: string): string | null {
  return FAMILLE_PAR_CODE.get(code) ?? null;
}

/** Texte brut d'un verset découpé pour le tajwid. */
export function texteDesSegments(segments: readonly SegmentTajwid[]): string {
  return segments.map((s) => (typeof s === "string" ? s : s[1])).join("");
}

/** Fichier audio d'un verset (convention EveryAyah : 002255.mp3). */
export function fichierVerset(sourate: number, verset: number): string {
  return `${String(sourate).padStart(3, "0")}${String(verset).padStart(3, "0")}.mp3`;
}

/** Chiffres arabes orientaux (numéro de verset). */
export function chiffresArabes(n: number): string {
  return String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)]!);
}

/** Verset suivant à réciter (répétition, fin de sourate) ; null quand la sourate est finie. */
export function versetSuivant(actuel: number, total: number, repeter: boolean): number | null {
  if (repeter) return actuel;
  return actuel < total ? actuel + 1 : null;
}

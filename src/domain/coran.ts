/**
 * Règles pures de la lecture du Coran : tajwid en couleur et récitation verset par verset.
 */

/** Basmala affichée en tête des sourates (sauf Al-Fatiha, où elle est le verset 1 en Hafs, et At-Tawba). */
export const BASMALA = {
  hafs: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
  warsh: "بِسْمِ اِ۬للَّهِ اِ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ",
} as const;

/** La sourate commence par une basmala non numérotée. */
export const aBasmala = (sourate: number): boolean => sourate !== 1 && sourate !== 9;

/** Juz d'une page du mushaf (débuts de juz en pages). */
export function juzDePage(page: number, debutsJuz: readonly number[]): number {
  let juz = 1;
  debutsJuz.forEach((debut, i) => {
    if (debut <= page) juz = i + 1;
  });
  return juz;
}

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

// ---------- Récitation verset par verset ----------------------------------

/** Clé d'un verset affiché : « sourate:verset » (verset 0 : basmala). */
export const cleVerset = (sourate: number, verset: number): string => `${sourate}:${verset}`;

/** Un fichier à réciter et les versets affichés qu'il couvre. */
export interface Piste {
  /** Sourate et verset du fichier (numérotation Hafs, celle des fichiers EveryAyah). */
  sourate: number;
  ayah: number;
  /** Versets affichés couverts par ce fichier (clés « s:v »), dans l'ordre. */
  cles: string[];
}

/** Une sourate (ou une partie de sourate) affichée à l'écran. */
export interface BlocLecture {
  sourate: number;
  /** Versets affichés, dans la numérotation de la lecture. */
  versets: readonly number[];
  /** La basmala est affichée en tête du bloc. */
  basmala: boolean;
}

/**
 * Fichiers à réciter pour les blocs affichés.
 * - Hafs : un fichier par verset ; la basmala d'une sourate est le fichier 1:1.
 * - Warsh : les fichiers suivent la numérotation Hafs. `correspondance(s)` donne, pour chaque
 *   verset Hafs de la sourate, les versets Warsh qu'il contient (ex. Al-Fatiha : 1:1 = basmala, 1:7 = Warsh 6 et 7).
 */
export function pistesLecture(
  blocs: readonly BlocLecture[],
  correspondance?: (sourate: number) => readonly (readonly number[])[] | undefined,
): Piste[] {
  const pistes: Piste[] = [];
  for (const bloc of blocs) {
    const affiches = new Set(bloc.versets);
    if (bloc.basmala) pistes.push({ sourate: 1, ayah: 1, cles: [cleVerset(bloc.sourate, 0)] });
    const table = correspondance?.(bloc.sourate);
    if (!table) {
      for (const v of bloc.versets)
        pistes.push({ sourate: bloc.sourate, ayah: v, cles: [cleVerset(bloc.sourate, v)] });
      continue;
    }
    table.forEach((versets, i) => {
      const ayah = i + 1;
      const couverts = versets.filter((v) => affiches.has(v));
      // Al-Fatiha en Warsh : la basmala (fichier 1:1) est récitée mais pas numérotée.
      const basmalaFatiha = bloc.sourate === 1 && ayah === 1 && affiches.has(1);
      if (couverts.length || basmalaFatiha) {
        pistes.push({ sourate: bloc.sourate, ayah, cles: couverts.map((v) => cleVerset(bloc.sourate, v)) });
      }
    });
  }
  return pistes;
}

/**
 * Warsh → Hafs : versets Hafs qui composent le verset Warsh `w`, d'après la table
 * de la sourate (pour chaque verset Hafs, les versets Warsh qu'il contient).
 */
export function versetsHafsDuVerset(table: readonly (readonly number[])[], w: number): number[] {
  const hafs: number[] = [];
  table.forEach((warsh, i) => {
    if (warsh.includes(w)) hafs.push(i + 1);
  });
  return hafs;
}

/** Répétitions pour mémoriser : chaque fichier `verset` fois, tout le passage `passage` fois (0 : sans fin). */
export interface Repetition {
  verset: number;
  /** 0 : en boucle. */
  passage: number;
}

/** Passage d'une sourate (versets inclus). */
export interface Passage {
  du: number;
  au: number;
}

/** « Versets 3 à 7 : chaque verset 3 fois, puis le tout en boucle. » */
export function resumeMemoriser(p: Passage, r: Repetition): string {
  const quoi = p.du === p.au ? `Verset ${p.du}` : `Versets ${p.du} à ${p.au}`;
  const verset = r.verset > 1 ? `chaque verset ${r.verset} fois` : "";
  const toutLe = verset || p.du !== p.au ? "le tout " : "";
  const tout = r.passage === 0 ? `${toutLe}en boucle` : r.passage > 1 ? `${toutLe}${r.passage} fois` : "";
  const suite = [verset, tout].filter(Boolean).join(", puis ");
  return suite ? `${quoi} : ${suite}.` : `${quoi}, une fois.`;
}

/** Version courte pour le lecteur : « Versets 3 → 7 · 3× chacun · en boucle ». */
export function resumeCourtMemoriser(p: Passage, r: Repetition): string {
  return [
    p.du === p.au ? `Verset ${p.du}` : `Versets ${p.du} → ${p.au}`,
    r.verset > 1 ? `${r.verset}× chacun` : "",
    r.passage === 0 ? "en boucle" : r.passage > 1 ? `${r.passage}× le tout` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface Position {
  piste: number;
  /** Écoutes déjà faites du fichier en cours / du passage. */
  foisVerset: number;
  foisPassage: number;
}

/** Ce qu'on récite après la fin d'un fichier ; null quand tout est fini. */
export function etapeSuivante(position: Position, nbPistes: number, rep: Repetition): Position | null {
  const foisVerset = position.foisVerset + 1;
  if (foisVerset < Math.max(1, rep.verset)) return { ...position, foisVerset };
  if (position.piste + 1 < nbPistes)
    return { piste: position.piste + 1, foisVerset: 0, foisPassage: position.foisPassage };
  const foisPassage = position.foisPassage + 1;
  if (rep.passage === 0 || foisPassage < rep.passage) return { piste: 0, foisVerset: 0, foisPassage };
  return null;
}

// ---------- Mot par mot ----------------------------------------------------

/** Un « mot » compte s'il contient au moins une lettre arabe (ni numéro, ni signe seul). */
function estMot(texte: string): boolean {
  return /[ء-يٱ-ۓ]/.test(texte);
}

/** Découpe un verset en mots (le numéro final et les signes isolés restent à part). */
export function decouperMots(texte: string): { texte: string; mot: number | null }[] {
  const morceaux = texte.split(/(\s+)/).filter((m) => m.length > 0);
  let n = 0;
  return morceaux.map((m) => (estMot(m) ? { texte: m, mot: ++n } : { texte: m, mot: null }));
}

/** Même découpage pour un verset coloré (tajwid) : chaque mot garde ses couleurs. */
export function decouperMotsTajwid(
  segments: readonly SegmentTajwid[],
): { segments: SegmentTajwid[]; mot: number | null }[] {
  // Lettre par lettre (avec sa règle), puis regroupement en mots et espaces.
  const lettres = segments.flatMap((s) =>
    typeof s === "string"
      ? [...s].map((c) => ({ c, regle: null as CodeTajwid | null }))
      : [...s[1]].map((c) => ({ c, regle: s[0] as CodeTajwid | null })),
  );
  const groupes: (typeof lettres)[] = [];
  for (const l of lettres) {
    const dernier = groupes.at(-1);
    const espace = /\s/.test(l.c);
    if (dernier && /\s/.test(dernier[0]!.c) === espace) dernier.push(l);
    else groupes.push([l]);
  }
  let n = 0;
  return groupes.map((g) => {
    const morceaux: SegmentTajwid[] = [];
    for (const l of g) {
      const dernier = morceaux.at(-1);
      const regleDernier =
        dernier === undefined ? undefined : typeof dernier === "string" ? null : dernier[0];
      if (dernier !== undefined && regleDernier === l.regle) {
        morceaux[morceaux.length - 1] =
          typeof dernier === "string" ? dernier + l.c : [dernier[0], dernier[1] + l.c];
      } else {
        morceaux.push(l.regle ? [l.regle, l.c] : l.c);
      }
    }
    const texte = g.map((l) => l.c).join("");
    return { segments: morceaux, mot: estMot(texte) ? ++n : null };
  });
}

/** Repère d'un mot dans l'enregistrement d'un verset (millisecondes). */
export interface RepereMot {
  mot: number;
  debut: number;
  fin: number;
}

/** Mot récité à l'instant `ms` ; null entre deux mots ou hors du verset. */
export function motA(reperes: readonly RepereMot[], ms: number): number | null {
  for (const r of reperes) if (ms >= r.debut && ms < r.fin) return r.mot;
  return null;
}

// ---------- Marque-pages ------------------------------------------------------

export interface MarquePage {
  lecture: "hafs" | "warsh";
  sourate: number;
  verset: number;
  /** Date d'ajout (ISO). */
  ajouteLe: string;
}

const memeVerset = (a: Omit<MarquePage, "ajouteLe">, b: Omit<MarquePage, "ajouteLe">) =>
  a.lecture === b.lecture && a.sourate === b.sourate && a.verset === b.verset;

export function estMarque(liste: readonly MarquePage[], v: Omit<MarquePage, "ajouteLe">): boolean {
  return liste.some((m) => memeVerset(m, v));
}

/** Ajoute le verset (en tête, le plus récent d'abord) ou le retire s'il y est déjà. */
export function basculerMarquePage(
  liste: readonly MarquePage[],
  v: Omit<MarquePage, "ajouteLe">,
  maintenant: string,
): MarquePage[] {
  if (estMarque(liste, v)) return liste.filter((m) => !memeVerset(m, v));
  return [{ ...v, ajouteLe: maintenant }, ...liste];
}

/** Lecture sûre de marque-pages gardés (données du téléphone, donc à vérifier). */
export function lireMarquePages(brut: unknown): MarquePage[] {
  if (!Array.isArray(brut)) return [];
  return brut.filter(
    (m): m is MarquePage =>
      typeof m === "object" &&
      m !== null &&
      (m.lecture === "hafs" || m.lecture === "warsh") &&
      Number.isInteger(m.sourate) &&
      m.sourate >= 1 &&
      m.sourate <= 114 &&
      Number.isInteger(m.verset) &&
      m.verset >= 1 &&
      typeof m.ajouteLe === "string",
  );
}

// ---------- Minuterie d'écoute ------------------------------------------------

/** « 14:05 » ; au-delà d'une heure « 1 h 02 ». */
export function libelleMinuterie(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Volume pendant les dernières secondes (fondu de `fondu` ms jusqu'au silence). */
export function volumeMinuterie(resteMs: number, fondu = 10_000): number {
  if (resteMs >= fondu) return 1;
  return Math.max(0, resteMs / fondu);
}

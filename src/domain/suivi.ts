/**
 * Suivi en direct sur le téléphone : ce que le modèle a entendu (écriture phonétique) et l'endroit du passage
 * où l'élève est arrivé. Copie fidèle de moteur.entendre (décodage) et moteur._situer (côté serveur).
 */

/** Symboles du modèle, dans l'ordre de sa sortie (api/_tajwid/config.json ; 0 = blanc). */
export const PHONEMES = [
  "ء",
  "ب",
  "ت",
  "ث",
  "ج",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "ل",
  "م",
  "ن",
  "ه",
  "و",
  "ي",
  "ا",
  "ۦ",
  "ۥ",
  "َ",
  "ُ",
  "ِ",
  "۪",
  "ـ",
  "ٲ",
  "ڇ",
  "ں",
  "۾",
  "ۜ",
  "ؙ",
] as const;

/**
 * Le modèle compressé (int8, 23 Mo), servi par l'appli et gardé dans le téléphone : son empreinte est
 * vérifiée avant usage (la même que celle du serveur, api/_tajwid/modeles.json).
 */
export const EMPREINTE_MODELE = "79cca1a2fc7ef81e325a3071a5f26cfec69203ef2c63177549065cdc1022c373";
export const ADRESSE_MODELE = `/tajwid/modele-${EMPREINTE_MODELE.slice(0, 12)}.onnx`;

/** Lectures connues du modèle (entrée « riwaya »). */
export const RIWAYAT = ["hafs", "warsh"] as const;

/** Meilleur chemin CTC : le symbole le plus probable à chaque instant, répétitions fusionnées, blancs retirés. */
export function decoderCtc(logprobs: Float32Array, instants: number, symboles: number): string {
  let sortie = "";
  let prec = 0;
  for (let t = 0; t < instants; t++) {
    let meilleur = 0;
    let max = -Infinity;
    const base = t * symboles;
    for (let i = 0; i < symboles; i++) {
      const v = logprobs[base + i]!;
      if (v > max) {
        max = v;
        meilleur = i;
      }
    }
    if (meilleur !== prec && meilleur !== 0) sortie += PHONEMES[meilleur - 1] ?? "";
    prec = meilleur;
  }
  return sortie;
}

/** Distance d'édition (insertions, suppressions, remplacements), comme Levenshtein.distance. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  let cour = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cour[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cout = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cour[j] = Math.min(prec[j]! + 1, cour[j - 1]! + 1, prec[j - 1]! + cout);
    }
    [prec, cour] = [cour, prec];
  }
  return prec[b.length]!;
}

/** Écriture phonétique attendue du passage, et la place [début, fin) de chaque mot dans cette écriture. */
export interface Reference {
  phonemes: string;
  spans: readonly (readonly [number, number])[];
}

/**
 * Les mots [a, b) que couvrent les dernières secondes entendues : le départ près de « depuis » (l'élève peut
 * reprendre un peu avant), la fin là où l'écriture attendue ressemble le plus à ce qui a été entendu.
 */
export function situer(
  entendu: string,
  ref: Reference,
  depuis: number,
  recul = 25,
  ecart = 0.15,
): [number, number] {
  const n = ref.spans.length;
  let meilleur: [number, number, number] = [Infinity, depuis, Math.min(n, depuis + 1)];
  for (let a = Math.max(0, depuis - recul); a < Math.min(n, depuis + 2); a++) {
    const debut = ref.spans[a]![0];
    for (let b = a + 1; b <= n; b++) {
      const attendu = ref.phonemes.slice(debut, ref.spans[b - 1]![1]);
      if (attendu.length > 2 * entendu.length + 20) break;
      const d = distance(attendu, entendu) + ecart * Math.abs(a - depuis);
      if (d < meilleur[0]) meilleur = [d, a, b];
    }
  }
  return [meilleur[1], meilleur[2]];
}

/** Ce que rend le suivi : jusqu'où l'élève est arrivé (comme la réponse du serveur, `couverts`). */
export function couverts(entendu: string, ref: Reference, depuis: number): [number, number] {
  const n = ref.spans.length;
  if (entendu.length < 4 || !n) return [depuis, depuis];
  return situer(entendu, ref, Math.max(0, Math.min(depuis, n - 1)));
}

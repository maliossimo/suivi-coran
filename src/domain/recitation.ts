/**
 * « Vérifier ma récitation » : compare, mot à mot, ce que la reconnaissance vocale
 * a entendu avec le texte du verset. Règles pures, sans navigateur.
 *
 * La reconnaissance écrit l'arabe courant, sans voyelles et sans l'orthographe du mushaf
 * (« الصلاة » pour « ٱلصَّلَوٰةَ ») : on compare donc des formes simplifiées, et deux mots
 * assez proches comptent comme justes.
 */
import { decouperMots } from "./coran";

export type StatutMot = "juste" | "different" | "oublie";

export interface MotVerifie {
  /** Le mot tel qu'il est écrit dans le verset. */
  texte: string;
  statut: StatutMot;
  /** Ce qui a été entendu à sa place (statut « different »). */
  entendu?: string;
}

export interface Verification {
  mots: MotVerifie[];
  justes: number;
  /** Mots entendus en trop. */
  ajoutes: number;
  /** Part des mots justes, de 0 à 100. */
  score: number;
}

const DIACRITIQUES = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Forme simplifiée d'un mot arabe : sans voyelles ni signes, lettres proches unifiées. */
export function normaliserArabe(mot: string): string {
  return mot
    .replace(DIACRITIQUES, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");
}

/** Écrit plein (ص+ل+و+ة → ص+ل+ا+ة) : le waw ou le ya de l'orthographe ancienne devient alif. */
function variantes(mot: string): string[] {
  const v = new Set([mot, mot.replace(/وه$/, "اه"), mot.replace(/و(?=[^\s]$)/, "ا")]);
  return [...v];
}

function distance(a: string, b: string): number {
  const ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = ligne[0]!;
    ligne[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const haut = ligne[j]!;
      ligne[j] = Math.min(haut + 1, ligne[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = haut;
    }
  }
  return ligne[b.length]!;
}

/** Ressemblance de 0 (rien à voir) à 1 (identiques), sur les formes simplifiées. */
export function ressemblance(attendu: string, entendu: string): number {
  const b = normaliserArabe(entendu);
  let meilleure = 0;
  for (const a of variantes(normaliserArabe(attendu))) {
    const longueur = Math.max(a.length, b.length);
    if (longueur === 0) return 1;
    meilleure = Math.max(meilleure, 1 - distance(a, b) / longueur);
  }
  return meilleure;
}

const SEUIL_JUSTE = 0.7;

/** Mots du verset (sans le numéro ni les signes isolés). */
export function motsDuVerset(texte: string): string[] {
  return decouperMots(texte)
    .filter((m) => m.mot !== null)
    .map((m) => m.texte);
}

/**
 * Aligne les mots attendus et entendus (comme une distance d'édition, mot par mot)
 * pour dire, pour chaque mot du verset, s'il a été récité, remplacé ou oublié.
 */
export function verifierRecitation(texteVerset: string, transcription: string): Verification {
  const attendus = motsDuVerset(texteVerset);
  const entendus = transcription.split(/\s+/).filter((m) => normaliserArabe(m).length > 0);
  const n = attendus.length;
  const m = entendus.length;
  const proche = (i: number, j: number) => ressemblance(attendus[i]!, entendus[j]!) >= SEUIL_JUSTE;

  // cout[i][j] : meilleur alignement des i premiers mots attendus avec les j premiers entendus.
  const cout: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cout[i]![j] = Math.min(
        cout[i - 1]![j - 1]! + (proche(i - 1, j - 1) ? 0 : 1),
        cout[i - 1]![j]! + 1,
        cout[i]![j - 1]! + 1,
      );
    }
  }

  const mots: MotVerifie[] = [];
  let ajoutes = 0;
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cout[i]![j] === cout[i - 1]![j - 1]! + (proche(i - 1, j - 1) ? 0 : 1)) {
      mots.unshift(
        proche(i - 1, j - 1)
          ? { texte: attendus[i - 1]!, statut: "juste" }
          : { texte: attendus[i - 1]!, statut: "different", entendu: entendus[j - 1]! },
      );
      i--;
      j--;
    } else if (i > 0 && cout[i]![j] === cout[i - 1]![j]! + 1) {
      mots.unshift({ texte: attendus[i - 1]!, statut: "oublie" });
      i--;
    } else {
      ajoutes++;
      j--;
    }
  }

  const justes = mots.filter((x) => x.statut === "juste").length;
  return { mots, justes, ajoutes, score: n ? Math.round((justes / n) * 100) : 0 };
}

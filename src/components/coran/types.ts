import type { SegmentTajwid } from "@/domain/coran";

/** Récitation proposée dans le lecteur (voir src/donnees/recitateurs.ts). */
export interface RecitationAffichee {
  id: string;
  nom: string;
  style: string;
  /** Vrai : un fichier par verset, le texte suit la récitation. */
  suivi: boolean;
  source: string;
  mots: string | null;
  dossier: string | null;
  alignement: string | null;
}

/** Une sourate (ou le morceau de sourate d'une page du mushaf). */
export interface BlocAffiche {
  sourate: number;
  nomAr: string;
  nomLatin: string;
  nbVersets: number;
  debut: boolean;
  basmala: string | null;
  versets: { n: number; texte: string; tajwid: SegmentTajwid[] | null }[];
}

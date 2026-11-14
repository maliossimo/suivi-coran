import "server-only";
import { z } from "zod";
import { signerJetonTajwid } from "@/lib/tajwid";
import type { Profil } from "@/repositories/profils";
import { enregistrerSignalement, listerSignalements, type Signalement } from "@/repositories/tajwid";
import { peutOuvrirCoran } from "./coran";

/** Jeton pour analyser une récitation : réservé à qui peut ouvrir le Coran. */
export function jetonTajwid(profil: Profil | null): string | null {
  if (!profil || !peutOuvrirCoran(profil)) return null;
  return signerJetonTajwid(profil.id);
}

const schemaSignalement = z.object({
  lecture: z.enum(["hafs", "warsh"]),
  sourate: z.number().int().min(1).max(114),
  verset: z.number().int().min(1).max(286),
  mot: z.string().trim().min(1).max(60),
  regles: z.array(z.string().max(60)).max(10),
  remarque: z.string().max(300).nullable(),
});

/** « L'appli s'est trompée » sur un mot : gardé pour régler le moteur (mot et règles, jamais l'audio). */
export async function signalerErreurTajwid(
  profil: Profil | null,
  brut: unknown,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!profil || !peutOuvrirCoran(profil)) return { ok: false, erreur: "Indisponible." };
  const saisie = schemaSignalement.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: "Signalement invalide." };
  try {
    await enregistrerSignalement(saisie.data);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Signalement impossible pour l’instant." };
  }
}

/** Nom en français des règles du moteur (imam.py). */
export const NOM_REGLE: Record<string, string> = {
  NormalMaddRule: "Madd naturel",
  MonfaselMaddRule: "Madd munfasil",
  MottaselMaddRule: "Madd muttasil",
  MottaselMaddPauseRule: "Madd muttasil (arrêt)",
  LazemMaddRule: "Madd lazim",
  AaredMaddRule: "Madd ʿarid",
  LeenMaddRule: "Madd lin",
  BadalMadd: "Madd badal",
  LeenHamzaMadd: "Madd lin (hamza)",
  qalqalah: "Qalqala",
  ikhfa: "Ikhfaʾ",
  iqlab: "Iqlab",
  idgham: "Idgham",
  idgham_ghunnah: "Idgham avec ghunna",
  ghunnah: "Ghunna",
  shadda: "Chadda",
  vowel: "Voyelle",
  letter: "Lettre",
  dropped: "Son omis",
  added: "Son ajouté",
  madd_added: "Madd ajouté",
  word: "Mot non entendu",
};

export interface BilanSignalements {
  total: number;
  /** Règles les plus signalées, de la plus fréquente à la moins fréquente. */
  parRegle: { regle: string; nom: string; nombre: number }[];
  derniers: Signalement[];
}

/** Pour l'admin : ce que les élèves signalent comme faux, pour régler le moteur. */
export async function chargerSignalementsTajwid(profil: Profil): Promise<BilanSignalements | null> {
  if (profil.role !== "admin" || !profil.actif) return null;
  const liste = await listerSignalements().catch(() => []);
  const compte = new Map<string, number>();
  for (const s of liste) {
    for (const r of new Set(s.regles.map((x) => x.split(":")[0] ?? x)))
      compte.set(r, (compte.get(r) ?? 0) + 1);
  }
  return {
    total: liste.length,
    parRegle: [...compte]
      .map(([regle, nombre]) => ({ regle, nom: NOM_REGLE[regle] ?? regle, nombre }))
      .sort((a, b) => b.nombre - a.nombre),
    derniers: liste.slice(0, 20),
  };
}

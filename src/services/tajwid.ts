import "server-only";
import { z } from "zod";
import { signerJetonTajwid } from "@/lib/tajwid";
import type { Profil } from "@/repositories/profils";
import { enregistrerSignalement } from "@/repositories/tajwid";
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

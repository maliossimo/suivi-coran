import "server-only";
import type { Profil } from "@/repositories/profils";
import { signerJetonTajwid } from "@/lib/tajwid";
import { peutOuvrirCoran } from "./coran";

/** Jeton pour analyser une récitation : réservé à qui peut ouvrir le Coran. */
export function jetonTajwid(profil: Profil | null): string | null {
  if (!profil || !peutOuvrirCoran(profil)) return null;
  return signerJetonTajwid(profil.id);
}

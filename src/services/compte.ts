import "server-only";
import { z } from "zod";
import { changerMonNom, type Profil } from "@/repositories/profils";

const schemaNom = z.object({
  prenom: z.string().trim().min(1, "Écris ton prénom.").max(60, "60 caractères au plus."),
  nom: z.string().trim().max(60, "60 caractères au plus."),
});

/** Prénom et nom de la personne connectée (demandés une fois s'ils manquent). */
export async function enregistrerMonNom(
  profil: Profil | null,
  brut: unknown,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!profil || !profil.actif) return { ok: false, erreur: "Connecte-toi d’abord." };
  const saisie = schemaNom.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Saisie invalide." };
  try {
    await changerMonNom(profil.id, saisie.data.prenom, saisie.data.nom);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Enregistrement impossible pour l’instant." };
  }
}

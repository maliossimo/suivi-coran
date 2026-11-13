import "server-only";
import { z } from "zod";
import {
  appareilsVerification,
  niveauVerification,
  preparerAppareil,
  retirerAppareil,
  verifierCode,
  verifierCodeAppareil,
  type Appareil,
} from "@/repositories/auth";
import { profilConnecte, type Profil } from "@/repositories/profils";
import type { ResultatSaisie } from "./fiche";

const schemaCode = z
  .string()
  .transform((c) => c.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Le code a 6 chiffres."));

/** Admin uniquement : la double vérification ne concerne que ce rôle. */
function exigerAdmin(acteur: Profil) {
  if (acteur.role !== "admin") throw new Error("Réservé à l'administrateur");
}

export async function chargerSecurite(acteur: Profil): Promise<{ appareils: Appareil[]; verifiee: boolean }> {
  exigerAdmin(acteur);
  const [appareils, niveau] = await Promise.all([appareilsVerification(), niveauVerification()]);
  return { appareils, verifiee: niveau.actuel === "aal2" };
}

export async function commencerAjoutAppareil(acteur: Profil, nomBrut: unknown) {
  exigerAdmin(acteur);
  const nom = z.string().trim().min(1).max(40).catch("Téléphone").parse(nomBrut);
  return preparerAppareil(nom);
}

export async function confirmerAppareil(
  acteur: Profil,
  idBrut: unknown,
  codeBrut: unknown,
): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  const code = schemaCode.safeParse(codeBrut);
  if (!id.success) return { ok: false, erreur: "Recommence l’ajout de l’appareil." };
  if (!code.success) return { ok: false, erreur: "Saisis les 6 chiffres affichés par l’appli." };
  const r = await verifierCodeAppareil(id.data, code.data);
  return r.ok
    ? { ok: true }
    : { ok: false, erreur: "Code incorrect ou expiré : saisis le code affiché maintenant." };
}

export async function verifierCodeConnexion(acteur: Profil, codeBrut: unknown): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const code = schemaCode.safeParse(codeBrut);
  if (!code.success) return { ok: false, erreur: "Saisis les 6 chiffres affichés par ton appli." };
  const r = await verifierCode(code.data);
  return r.ok
    ? { ok: true }
    : { ok: false, erreur: "Code incorrect ou expiré. Réessaie avec le code affiché maintenant." };
}

/** Retirer un appareil : il en faut toujours au moins un une fois la double vérification activée. */
export async function retirerUnAppareil(acteur: Profil, idBrut: unknown): Promise<ResultatSaisie> {
  exigerAdmin(acteur);
  const id = z.string().uuid().safeParse(idBrut);
  if (!id.success) return { ok: false, erreur: "Appareil introuvable." };
  const appareils = await appareilsVerification();
  if (appareils.length <= 1) {
    return {
      ok: false,
      erreur: "C’est ton seul appareil : ajoute d’abord un autre appareil avant de retirer celui-ci.",
    };
  }
  const r = await retirerAppareil(id.data);
  return r.ok ? { ok: true } : { ok: false, erreur: "Retrait impossible. Réessaie dans un instant." };
}

/** Où envoyer la personne qui ouvre /verification (null : le code doit être saisi). */
export async function destinationVerification(): Promise<string | null> {
  const profil = await profilConnecte();
  if (!profil) return "/connexion";
  if (profil.role !== "admin") return "/";
  const niveau = await niveauVerification();
  return niveau.suivant === "aal2" && niveau.actuel !== "aal2" ? null : "/admin";
}

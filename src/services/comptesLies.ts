import "server-only";
import { z } from "zod";
import { accueilDuRole } from "@/domain/roles";
import {
  delier,
  idParEmail,
  lier,
  comptesLiesDe,
  noterChangementEspace,
  ouvrirSessionDe,
  tousLesLiens,
  type CompteLie,
} from "@/repositories/comptesLies";
import type { Profil } from "@/repositories/profils";

export type ResultatLiens = { ok: true } | { ok: false; erreur: string };

/** Comptes actifs vers lesquels la personne connectée peut passer. */
export async function mesComptesLies(profil: Profil): Promise<CompteLie[]> {
  if (!profil.actif) return [];
  return (await comptesLiesDe(profil.id)).filter((c) => c.actif);
}

/** Page où arrive une personne qui vient de se connecter : le choix de l'espace si elle a un compte lié. */
export async function destinationApresIdentification(profil: Profil): Promise<string> {
  return (await mesComptesLies(profil)).length > 0 ? "/choisir-espace" : accueilDuRole(profil.role);
}

/** Passe de la session courante à celle d'un compte lié (le lien est revérifié par la base). */
export async function basculerVers(profil: Profil, cibleBrut: unknown): Promise<ResultatLiens> {
  const cible = z.string().uuid().safeParse(cibleBrut);
  if (!cible.success) return { ok: false, erreur: "Compte introuvable." };
  const permis = (await mesComptesLies(profil)).some((c) => c.id === cible.data);
  if (!permis) return { ok: false, erreur: "Ce compte n’est pas lié au tien." };
  // On note le passage d'abord : sans trace dans le journal, on ne change pas d'espace.
  if (!(await noterChangementEspace(profil.id, cible.data)))
    return { ok: false, erreur: "Impossible de changer d’espace pour l’instant." };
  return (await ouvrirSessionDe(cible.data))
    ? { ok: true }
    : { ok: false, erreur: "Impossible de changer d’espace pour l’instant." };
}

/** Liens existants (administrateur). */
export async function liensDeLAdmin(acteur: Profil): Promise<{ a: CompteLie; b: CompteLie }[]> {
  if (acteur.role !== "admin" || !acteur.actif) return [];
  return tousLesLiens();
}

/** L'administrateur lie son propre compte à celui dont il donne l'adresse e-mail. */
export async function lierMonCompte(acteur: Profil, emailBrut: unknown): Promise<ResultatLiens> {
  if (acteur.role !== "admin" || !acteur.actif) return { ok: false, erreur: "Réservé à l’administrateur." };
  const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").safeParse(emailBrut);
  if (!email.success)
    return { ok: false, erreur: email.error.issues[0]?.message ?? "Adresse e-mail invalide." };
  const id = await idParEmail(email.data);
  if (!id) return { ok: false, erreur: "Aucun compte avec cette adresse." };
  if (id === acteur.id) return { ok: false, erreur: "C’est ton propre compte." };
  return (await lier(acteur.id, id))
    ? { ok: true }
    : { ok: false, erreur: "Impossible de lier ces comptes (le compte existe-t-il bien ?)." };
}

/** L'administrateur retire un lien entre deux comptes. */
export async function delierComptes(acteur: Profil, aBrut: unknown, bBrut: unknown): Promise<ResultatLiens> {
  if (acteur.role !== "admin" || !acteur.actif) return { ok: false, erreur: "Réservé à l’administrateur." };
  const a = z.string().uuid().safeParse(aBrut);
  const b = z.string().uuid().safeParse(bBrut);
  if (!a.success || !b.success) return { ok: false, erreur: "Compte introuvable." };
  return (await delier(a.data, b.data))
    ? { ok: true }
    : { ok: false, erreur: "Impossible de retirer ce lien." };
}

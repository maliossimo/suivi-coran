import "server-only";
import { z } from "zod";
import { codeValide, etatInvitation, type EtatInvitation } from "@/domain/invitation";
import { connecter } from "@/repositories/auth";
import { compterUtilisation, creerCompteEleve, invitationParCode } from "@/repositories/invitations";
import type { ResultatSaisie } from "./fiche";

/*
 * Inscription d'un élève en scannant le QR code de sa classe.
 * Le code est vérifié côté serveur ; l'établissement vient du code, jamais du formulaire.
 */

export interface InfoInvitation {
  etat: EtatInvitation | "inconnue";
  etablissementNom: string;
}

export async function lireInvitation(code: string): Promise<InfoInvitation> {
  if (!codeValide(code)) return { etat: "inconnue", etablissementNom: "" };
  const invitation = await invitationParCode(code);
  if (!invitation) return { etat: "inconnue", etablissementNom: "" };
  return { etat: etatInvitation(invitation, new Date()), etablissementNom: invitation.etablissementNom };
}

const schemaInscription = z
  .object({
    prenom: z.string().trim().min(1, "Le prénom est obligatoire.").max(60),
    nom: z.string().trim().min(1, "Le nom est obligatoire.").max(60),
    email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
    motDePasse: z.string().min(10, "Mot de passe : 10 caractères minimum.").max(200),
    confirmation: z.string(),
  })
  .refine((v) => v.motDePasse === v.confirmation, { message: "Les deux mots de passe sont différents." });

export async function rejoindreClasse(code: string, brut: Record<string, unknown>): Promise<ResultatSaisie> {
  const saisie = schemaInscription.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: saisie.error.issues[0]?.message ?? "Saisie invalide." };

  const invitation = codeValide(code) ? await invitationParCode(code) : null;
  if (!invitation || etatInvitation(invitation, new Date()) !== "valide") {
    return {
      ok: false,
      erreur: "Ce QR code n'est plus valable. Demande à ton Cheikh d'en afficher un nouveau.",
    };
  }

  const { prenom, nom, email, motDePasse } = saisie.data;
  const compte = await creerCompteEleve({
    email,
    motDePasse,
    prenom,
    nom,
    etablissementId: invitation.etablissementId,
  });
  if (!compte.ok) {
    return {
      ok: false,
      erreur:
        compte.raison === "deja_inscrit"
          ? "Un compte existe déjà avec cette adresse : connecte-toi depuis la page de connexion."
          : "L'inscription n'a pas pu se faire. Réessaie dans un instant.",
    };
  }
  await compterUtilisation(invitation.id, invitation.utilisations);
  const jeton = typeof brut.jetonAntiRobot === "string" ? brut.jetonAntiRobot.slice(0, 4096) : undefined;
  await connecter(email, motDePasse, jeton || undefined);
  return { ok: true };
}

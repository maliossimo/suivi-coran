"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { envPublic } from "@/lib/env";
import { changerMotDePasse, connecter, deconnecter, envoyerLienReinitialisation } from "@/repositories/auth";
import { destinationApresConnexion } from "@/services/acces";

export interface EtatFormulaire {
  erreur?: string;
  info?: string;
}

const schemaConnexion = z.object({
  email: z.string().trim().toLowerCase().email(),
  motDePasse: z.string().min(1).max(200),
});

export async function actionConnexion(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const saisie = schemaConnexion.safeParse({
    email: form.get("email"),
    motDePasse: form.get("motDePasse"),
  });
  if (!saisie.success) return { erreur: "Adresse e-mail ou mot de passe invalide." };

  const { ok } = await connecter(saisie.data.email, saisie.data.motDePasse);
  // Message volontairement identique dans tous les cas d'échec.
  if (!ok) return { erreur: "Adresse e-mail ou mot de passe incorrect." };

  redirect(await destinationApresConnexion());
}

export async function actionDeconnexion(): Promise<void> {
  await deconnecter();
  redirect("/connexion");
}

const schemaEmail = z.object({ email: z.string().trim().toLowerCase().email() });

export async function actionMotDePasseOublie(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const saisie = schemaEmail.safeParse({ email: form.get("email") });
  if (!saisie.success) return { erreur: "Adresse e-mail invalide." };

  await envoyerLienReinitialisation(
    saisie.data.email,
    `${envPublic.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-mot-de-passe`,
  );
  return { info: "Si cette adresse est inscrite, un e-mail vient d'être envoyé." };
}

const schemaMotDePasse = z
  .object({
    motDePasse: z.string().min(10, "10 caractères minimum.").max(200),
    confirmation: z.string(),
  })
  .refine((v) => v.motDePasse === v.confirmation, { message: "Les deux mots de passe sont différents." });

export async function actionDefinirMotDePasse(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const saisie = schemaMotDePasse.safeParse({
    motDePasse: form.get("motDePasse"),
    confirmation: form.get("confirmation"),
  });
  if (!saisie.success) return { erreur: saisie.error.issues[0]?.message ?? "Mot de passe invalide." };

  const res = await changerMotDePasse(saisie.data.motDePasse);
  if (!res.ok) return { erreur: "Impossible d'enregistrer ce mot de passe. Réessaie." };

  redirect(await destinationApresConnexion());
}

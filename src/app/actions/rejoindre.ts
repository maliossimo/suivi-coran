"use server";

import { redirect } from "next/navigation";
import { rejoindreClasse } from "@/services/rejoindre";
import type { EtatSaisie } from "./fiche";
import { notifier } from "./notification";

export async function actionRejoindre(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const code = String(form.get("code") ?? "");
  const resultat = await rejoindreClasse(code, {
    prenom: form.get("prenom"),
    nom: form.get("nom"),
    email: form.get("email"),
    motDePasse: form.get("motDePasse"),
    confirmation: form.get("confirmation"),
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Bienvenue dans la classe !");
  redirect("/bienvenue");
}

"use server";

import { redirect } from "next/navigation";
import { envoyerCodeAdmin, validerCodeAdmin } from "@/services/codeAdmin";

export type EtatCode = { erreur?: string; envoye?: boolean };

export async function actionEnvoyerCode(etat: EtatCode, form: FormData): Promise<EtatCode> {
  const r = await envoyerCodeAdmin(form.get("cf-turnstile-response"));
  return r.ok ? { envoye: true } : { envoye: etat.envoye, erreur: r.erreur };
}

export async function actionValiderCode(_: EtatCode, form: FormData): Promise<EtatCode> {
  const r = await validerCodeAdmin(form.get("code"));
  if (!r.ok) return { envoye: true, erreur: r.erreur };
  redirect("/admin");
}

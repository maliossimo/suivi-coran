import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
import { creerClientServeur } from "@/lib/supabase/server";

export type TypeLienEmail = EmailOtpType;
export const TYPES_LIEN_EMAIL: readonly TypeLienEmail[] = ["invite", "recovery", "email", "email_change"];

export async function connecter(email: string, motDePasse: string): Promise<{ ok: boolean }> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  return { ok: !error };
}

export async function deconnecter(): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase.auth.signOut();
}

/** Valide le lien reçu par e-mail (invitation, réinitialisation). */
export async function verifierLienEmail(tokenHash: string, type: EmailOtpType): Promise<{ ok: boolean }> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return { ok: !error };
}

export async function changerMotDePasse(motDePasse: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function envoyerLienReinitialisation(email: string, redirection: string): Promise<void> {
  const supabase = await creerClientServeur();
  // Réponse identique que l'adresse existe ou non : on ne révèle pas qui est inscrit.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirection });
}

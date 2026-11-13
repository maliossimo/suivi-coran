import "server-only";
import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import { envPublic } from "@/lib/env";
import { creerClientServeur } from "@/lib/supabase/server";

export type TypeLienEmail = EmailOtpType;
export const TYPES_LIEN_EMAIL: readonly TypeLienEmail[] = ["invite", "recovery", "email", "email_change"];

/** `jetonAntiRobot` : jeton Cloudflare Turnstile du formulaire (exigé par Supabase s'il est activé). */
export async function connecter(
  email: string,
  motDePasse: string,
  jetonAntiRobot?: string,
): Promise<{ ok: boolean }> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
    options: jetonAntiRobot ? { captchaToken: jetonAntiRobot } : undefined,
  });
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

export async function envoyerLienReinitialisation(
  email: string,
  redirection: string,
  jetonAntiRobot?: string,
): Promise<void> {
  const supabase = await creerClientServeur();
  // Réponse identique que l'adresse existe ou non : on ne révèle pas qui est inscrit.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirection,
    ...(jetonAntiRobot ? { captchaToken: jetonAntiRobot } : {}),
  });
}

/** Adresse e-mail de la personne connectée (affichée dans « Mon compte »). */
export async function emailConnecte(): Promise<string | null> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

// ---------- Code de l'administrateur (reçu par e-mail) ----------

/** Client sans session enregistrée : vérifier un code ne doit pas toucher à la session en cours. */
function clientSansSession() {
  return createClient(envPublic.NEXT_PUBLIC_SUPABASE_URL, envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Session en cours : identifiant (un par appareil connecté), personne et e-mail. */
export async function sessionEnCours(): Promise<{
  sessionId: string;
  userId: string;
  email: string | null;
} | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.session_id || !claims.sub) return null;
  return { sessionId: String(claims.session_id), userId: claims.sub, email: claims.email ?? null };
}

/** Cette session (cet appareil) a déjà saisi le code de l'admin. */
export async function sessionVerifiee(): Promise<boolean> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("session_verifiee");
  return !error && data === true;
}

/** Envoie un code à usage unique à l'adresse du compte (aucun compte n'est créé). */
export async function envoyerCodeEmail(
  email: string,
  jetonAntiRobot?: string,
): Promise<{ ok: boolean; trop: boolean }> {
  const { error } = await clientSansSession().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, captchaToken: jetonAntiRobot },
  });
  return { ok: !error, trop: error?.status === 429 };
}

/** Vérifie le code reçu par e-mail. La session créée au passage est aussitôt fermée. */
export async function verifierCodeEmail(email: string, code: string): Promise<boolean> {
  const client = clientSansSession();
  const { data, error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.session) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}

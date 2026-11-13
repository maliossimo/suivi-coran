import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
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

// ---------- Double vérification (appli d'authentification, TOTP) ----------

export interface NiveauVerification {
  /** aal1 : mot de passe seul ; aal2 : code de l'appli saisi pendant cette session. */
  actuel: "aal1" | "aal2" | null;
  /** aal2 si un appareil est enregistré (le code est alors exigé). */
  suivant: "aal1" | "aal2" | null;
}

export async function niveauVerification(): Promise<NiveauVerification> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { actuel: null, suivant: null };
  return { actuel: data.currentLevel, suivant: data.nextLevel };
}

export interface Appareil {
  id: string;
  nom: string;
  creeLe: string;
}

/** Appareils (applis d'authentification) enregistrés et vérifiés. */
export async function appareilsVerification(): Promise<Appareil[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return data.totp
    .filter((f) => f.status === "verified")
    .map((f) => ({ id: f.id, nom: f.friendly_name ?? "Appareil", creeLe: f.created_at }));
}

/**
 * Prépare un nouvel appareil : QR code à scanner et clé à saisir à la main.
 * Les tentatives précédentes non terminées sont d'abord retirées.
 */
export async function preparerAppareil(
  nom: string,
): Promise<{ ok: true; id: string; qr: string; cle: string } | { ok: false; message: string }> {
  const supabase = await creerClientServeur();
  const { data: liste } = await supabase.auth.mfa.listFactors();
  for (const f of liste?.all ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `${nom} · ${new Date().toISOString().slice(0, 16)}`,
    issuer: "Suivi cours Coran",
  });
  if (error || !data) return { ok: false, message: error?.message ?? "Préparation impossible" };
  return { ok: true, id: data.id, qr: data.totp.qr_code, cle: data.totp.secret };
}

/** Vérifie un code à 6 chiffres pour un appareil (confirme l'appareil et passe la session en aal2). */
export async function verifierCodeAppareil(appareilId: string, code: string): Promise<{ ok: boolean }> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: appareilId, code });
  return { ok: !error };
}

/** Code saisi à la connexion : essayé sur chacun des appareils enregistrés. */
export async function verifierCode(code: string): Promise<{ ok: boolean }> {
  for (const a of await appareilsVerification()) {
    if ((await verifierCodeAppareil(a.id, code)).ok) return { ok: true };
  }
  return { ok: false };
}

export async function retirerAppareil(appareilId: string): Promise<{ ok: boolean }> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.mfa.unenroll({ factorId: appareilId });
  return { ok: !error };
}

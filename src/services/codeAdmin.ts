import "server-only";
import { z } from "zod";
import { marquerSessionVerifiee } from "@/repositories/admin";
import { envoyerCodeEmail, sessionEnCours, sessionVerifiee, verifierCodeEmail } from "@/repositories/auth";
import { profilConnecte } from "@/repositories/profils";
import type { ResultatSaisie } from "./fiche";

const schemaCode = z
  .string()
  .transform((c) => c.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/));

/** Masque l'adresse : « ma•••@outlook.com ». */
function masquer(email: string): string {
  const [nom = "", domaine = ""] = email.split("@");
  return `${nom.slice(0, 2)}•••@${domaine}`;
}

async function sessionAdmin() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif || profil.role !== "admin") return null;
  const session = await sessionEnCours();
  return session?.email ? { profil, ...session, email: session.email } : null;
}

/** Page /verification : où aller si le code n'est pas (ou plus) à saisir, sinon l'adresse masquée. */
export async function etatVerification(): Promise<{ aller: string } | { email: string }> {
  const profil = await profilConnecte();
  if (!profil) return { aller: "/connexion" };
  if (profil.role !== "admin") return { aller: "/" };
  if (await sessionVerifiee()) return { aller: "/admin" };
  const session = await sessionEnCours();
  return session?.email ? { email: masquer(session.email) } : { aller: "/connexion" };
}

export async function envoyerCodeAdmin(jetonBrut: unknown): Promise<ResultatSaisie> {
  const s = await sessionAdmin();
  if (!s) return { ok: false, erreur: "Reconnecte-toi." };
  const jeton = z.string().min(1).optional().catch(undefined).parse(jetonBrut);
  const r = await envoyerCodeEmail(s.email, jeton);
  if (r.ok) return { ok: true };
  return {
    ok: false,
    erreur: r.trop
      ? "Un code vient déjà d’être envoyé : attends une minute avant d’en redemander un."
      : "Envoi du code impossible pour l’instant. Réessaie dans un instant.",
  };
}

export async function validerCodeAdmin(codeBrut: unknown): Promise<ResultatSaisie> {
  const s = await sessionAdmin();
  if (!s) return { ok: false, erreur: "Reconnecte-toi." };
  const code = schemaCode.safeParse(codeBrut);
  if (!code.success) return { ok: false, erreur: "Saisis le code reçu par e-mail (6 chiffres)." };
  if (!(await verifierCodeEmail(s.email, code.data))) {
    return { ok: false, erreur: "Code incorrect ou expiré. Vérifie l’e-mail le plus récent." };
  }
  if (!(await marquerSessionVerifiee(s.sessionId, s.userId))) {
    return { ok: false, erreur: "Vérification impossible : la clé « service role » n’est pas configurée." };
  }
  return { ok: true };
}

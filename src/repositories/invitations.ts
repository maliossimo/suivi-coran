import "server-only";
import { z } from "zod";
import type { InvitationClasse } from "@/domain/invitation";
import type { Role } from "@/domain/roles";
import { envPublic } from "@/lib/env";
import { clientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/server";

export type ResultatInvitation =
  | { ok: true }
  | { ok: false; raison: "non_configure" | "deja_inscrit" | "echec"; detail?: string };

/**
 * Envoie l'e-mail d'invitation Supabase. Les métadonnées créent le profil
 * (trigger creer_profil) ; le rôle admin n'est jamais attribuable ainsi.
 * L'appelant DOIT avoir vérifié les droits (maître de l'établissement, admin).
 */
export async function inviter(
  email: string,
  donnees: { prenom: string; nom: string; role: Exclude<Role, "admin">; etablissementId: string },
): Promise<ResultatInvitation> {
  const admin = clientAdmin();
  if (!admin) return { ok: false, raison: "non_configure" };

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      prenom: donnees.prenom,
      nom: donnees.nom,
      role: donnees.role,
      etablissement_id: donnees.etablissementId,
    },
    redirectTo: `${envPublic.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-mot-de-passe`,
  });
  if (!error) return { ok: true };
  if (/already|registered|exists/i.test(error.message)) return { ok: false, raison: "deja_inscrit" };
  return { ok: false, raison: "echec", detail: error.message };
}

// ---------- Invitations par QR code ---------------------------------------

const schemaInvitation = z.object({
  id: z.string().uuid(),
  code: z.string(),
  etablissement_id: z.string().uuid(),
  expire_le: z.string(),
  actif: z.boolean(),
  utilisations: z.number(),
});

function versInvitation(l: z.infer<typeof schemaInvitation>): InvitationClasse {
  return {
    id: l.id,
    code: l.code,
    etablissementId: l.etablissement_id,
    expireLe: l.expire_le,
    actif: l.actif,
    utilisations: l.utilisations,
  };
}

const COLONNES = "id, code, etablissement_id, expire_le, actif, utilisations";

/** Dernier code actif de l'établissement (lu avec les droits du maître). */
export async function invitationActive(etablissementId: string): Promise<InvitationClasse | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("invitations_classe")
    .select(COLONNES)
    .eq("etablissement_id", etablissementId)
    .eq("actif", true)
    .order("cree_le", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Lecture du QR code impossible : ${error.message}`);
  return data ? versInvitation(schemaInvitation.parse(data)) : null;
}

/** Désactive les codes de l'établissement (avec les droits du maître). */
export async function desactiverInvitations(etablissementId: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("invitations_classe")
    .update({ actif: false })
    .eq("etablissement_id", etablissementId)
    .eq("actif", true);
  if (error) throw new Error(`Désactivation impossible : ${error.message}`);
}

/** Crée un nouveau code (avec les droits du maître ; la base vérifie l'établissement). */
export async function creerInvitation(donnees: {
  etablissementId: string;
  creePar: string;
  code: string;
  expireLe: string;
}): Promise<InvitationClasse> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("invitations_classe")
    .insert({
      etablissement_id: donnees.etablissementId,
      cree_par: donnees.creePar,
      code: donnees.code,
      expire_le: donnees.expireLe,
    })
    .select(COLONNES)
    .single();
  if (error) throw new Error(`Création du QR code impossible : ${error.message}`);
  return versInvitation(schemaInvitation.parse(data));
}

/**
 * Lecture d'un code par un visiteur non connecté (page « Rejoindre la classe »).
 * Passe par la clé service role : l'appelant ne reçoit que le nécessaire.
 */
export async function invitationParCode(
  code: string,
): Promise<(InvitationClasse & { etablissementNom: string }) | null> {
  const admin = clientAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("invitations_classe")
    .select(`${COLONNES}, etablissements(nom)`)
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  const ligne = schemaInvitation
    .extend({ etablissements: z.object({ nom: z.string() }).nullable() })
    .parse(data);
  return { ...versInvitation(ligne), etablissementNom: ligne.etablissements?.nom ?? "" };
}

export async function compterUtilisation(id: string, utilisations: number): Promise<void> {
  const admin = clientAdmin();
  if (!admin) return;
  await admin
    .from("invitations_classe")
    .update({ utilisations: utilisations + 1 })
    .eq("id", id);
}

export type ResultatCreationCompte =
  | { ok: true }
  | { ok: false; raison: "non_configure" | "deja_inscrit" | "echec" };

/**
 * Crée directement un compte élève confirmé (inscription par QR code).
 * L'appelant DOIT avoir vérifié le code de la classe.
 */
export async function creerCompteEleve(donnees: {
  email: string;
  motDePasse: string;
  prenom: string;
  nom: string;
  etablissementId: string;
}): Promise<ResultatCreationCompte> {
  const admin = clientAdmin();
  if (!admin) return { ok: false, raison: "non_configure" };
  const { error } = await admin.auth.admin.createUser({
    email: donnees.email,
    password: donnees.motDePasse,
    email_confirm: true,
    user_metadata: {
      prenom: donnees.prenom,
      nom: donnees.nom,
      role: "eleve",
      etablissement_id: donnees.etablissementId,
    },
  });
  if (!error) return { ok: true };
  if (/already|registered|exists/i.test(error.message)) return { ok: false, raison: "deja_inscrit" };
  return { ok: false, raison: "echec" };
}

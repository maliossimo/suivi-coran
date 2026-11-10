import "server-only";
import type { Role } from "@/domain/roles";
import { envPublic } from "@/lib/env";
import { clientAdmin } from "@/lib/supabase/admin";

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

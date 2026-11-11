/**
 * Invitation par QR code : un code de classe valable quelques jours,
 * que le maître peut désactiver. Code pur, testé.
 */

export const DUREE_INVITATION_JOURS = 7;

export interface InvitationClasse {
  id: string;
  code: string;
  etablissementId: string;
  /** Horodatage ISO. */
  expireLe: string;
  actif: boolean;
  utilisations: number;
}

export type EtatInvitation = "valide" | "expiree" | "desactivee";

export function etatInvitation(
  inv: Pick<InvitationClasse, "actif" | "expireLe">,
  maintenant: Date,
): EtatInvitation {
  if (!inv.actif) return "desactivee";
  return new Date(inv.expireLe).getTime() > maintenant.getTime() ? "valide" : "expiree";
}

/** Date d'expiration d'un code créé maintenant. */
export function expirationDepuis(maintenant: Date, jours = DUREE_INVITATION_JOURS): string {
  return new Date(maintenant.getTime() + jours * 24 * 3600 * 1000).toISOString();
}

/** Un code de classe : 20 à 64 caractères sûrs dans une adresse (base64url). */
export function codeValide(code: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(code);
}

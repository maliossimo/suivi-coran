import "server-only";
import { createHash, createHmac } from "node:crypto";

/**
 * Jeton d'accès au moteur tajwid (fonction Python « api/moteur_tajwid.py »), valable quelques minutes.
 * Même forme et même clé que « api/_tajwid/jeton.py » : base64url(JSON) + "." + HMAC-SHA256 hexadécimal,
 * clé dérivée de la clé serveur Supabase (jamais transmise).
 */
const ETIQUETTE = "suivi-coran/moteur-tajwid/v1:";
export const DUREE_JETON_S = 300;

function cle(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (secret.length < 20) return null;
  return createHash("sha256")
    .update(ETIQUETTE + secret)
    .digest();
}

export function signerJetonTajwid(utilisateurId: string, maintenant = Date.now()): string | null {
  const k = cle();
  if (!k) return null;
  const corps = Buffer.from(
    JSON.stringify({ u: utilisateurId, exp: Math.floor(maintenant / 1000) + DUREE_JETON_S }),
  ).toString("base64url");
  return `${corps}.${createHmac("sha256", k).update(corps).digest("hex")}`;
}

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envPublic } from "@/lib/env";

/**
 * Client « service role » : contourne les règles RLS. Réservé aux opérations
 * d'administration des comptes (invitations). Ne jamais l'utiliser pour lire
 * ou écrire le suivi pédagogique, et toujours vérifier les droits de l'appelant
 * AVANT de l'utiliser.
 *
 * Renvoie null si la clé n'est pas configurée (SUPABASE_SERVICE_ROLE_KEY).
 */
export function clientAdmin(): SupabaseClient | null {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) return null;
  return createClient(envPublic.NEXT_PUBLIC_SUPABASE_URL, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { z } from "zod";

/**
 * Variables d'environnement publiques, validées au démarrage.
 * Une variable manquante fait échouer le build plutôt que de casser en production.
 */
const schemaPublic = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  // Clé publique Supabase (« anon » ou « publishable ») : protégée par les règles RLS.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const envPublic = schemaPublic.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

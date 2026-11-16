import "server-only";
import { z } from "zod";
import type { DateISO } from "@/domain/calendrier";
import type { LigneUsageCoran, QuoiCoran } from "@/domain/usagesCoran";
import { creerClientServeur } from "@/lib/supabase/server";

/** Compte une lecture, une écoute ou une récitation de la personne connectée (jamais bloquant). */
export async function noterUsageCoran(quoi: QuoiCoran, sourate: number): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase.rpc("noter_usage_coran", { p_quoi: quoi, p_sourate: sourate });
}

/** Compteurs depuis une date (admin : les règles d'accès ne le permettent qu'à lui). */
export async function usagesCoranDepuis(depuis: DateISO): Promise<LigneUsageCoran[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("usages_coran")
    .select("personne_id, jour, quoi, sourate, nombre, dernier, profils(prenom, nom, role)")
    .gte("jour", depuis)
    .order("dernier", { ascending: false })
    .limit(5000);
  if (error) return [];
  return z
    .array(
      z.object({
        personne_id: z.string().uuid(),
        jour: z.string(),
        quoi: z.enum(["lecture", "ecoute", "recitation"]),
        sourate: z.number().int(),
        nombre: z.number().int(),
        dernier: z.string(),
        profils: z
          .object({
            prenom: z.string().nullable(),
            nom: z.string().nullable(),
            role: z.enum(["eleve", "maitre", "admin"]),
          })
          .nullable(),
      }),
    )
    .parse(data)
    .map((l) => ({
      personneId: l.personne_id,
      nom: `${l.profils?.prenom ?? ""} ${l.profils?.nom ?? ""}`.trim() || "Sans nom",
      role: l.profils?.role ?? "eleve",
      jour: l.jour,
      quoi: l.quoi,
      sourate: l.sourate,
      nombre: l.nombre,
      dernier: l.dernier,
    }));
}

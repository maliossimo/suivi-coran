import "server-only";
import { creerClientServeur } from "@/lib/supabase/server";

/** Note une ouverture de l'appli par la personne connectée (la base en garde une par quart d'heure). */
export async function noterOuverture(): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase.from("ouvertures").insert({});
}

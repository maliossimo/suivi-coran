import { profilConnecte } from "@/repositories/profils";
import { motsARevoirAffiches } from "@/services/essais";

/**
 * Lecture du Coran : les mots à revoir de l'élève dans les sourates affichées.
 * Simple lecture en GET (et non une action serveur) : elle ne bloque jamais la navigation.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const sourates = (p.get("sourates") ?? "").split(",").filter(Boolean).map(Number).slice(0, 4);
  const donnees = await motsARevoirAffiches(await profilConnecte(), {
    lecture: p.get("lecture") ?? "hafs",
    sourates,
  }).catch(() => ({}));
  return Response.json(donnees, { headers: { "Cache-Control": "private, no-store" } });
}

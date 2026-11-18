import { profilConnecte } from "@/repositories/profils";
import { rechercherDansLeCoran } from "@/services/coran";

/** « Aller à » : recherche dans le Coran (GET : taper ne bloque jamais la navigation). */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const profil = await profilConnecte();
  const vide = { resultats: [], total: 0 };
  const r = profil
    ? await rechercherDansLeCoran(profil, { q: p.get("q") ?? "", lecture: p.get("lecture") ?? "hafs" }).catch(
        () => vide,
      )
    : vide;
  return Response.json(r, { headers: { "Cache-Control": "private, no-store" } });
}

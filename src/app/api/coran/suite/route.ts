import { profilConnecte } from "@/repositories/profils";
import { chargerSourateSuivante } from "@/services/coran";

/** Lecture en continu : la sourate qui suit celle affichée (GET : ne bloque pas la navigation). */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const profil = await profilConnecte();
  const bloc = profil
    ? await chargerSourateSuivante(profil, p.get("lecture"), Number(p.get("sourate"))).catch(() => null)
    : null;
  return Response.json(bloc, { headers: { "Cache-Control": "private, no-store" } });
}

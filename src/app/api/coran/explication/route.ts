import type { NextRequest } from "next/server";
import { profilConnecte } from "@/repositories/profils";
import { chargerExplications } from "@/services/explications";

/** Explication en français des versets d'une sourate (gardée ensuite sur le téléphone). */
export async function GET(requete: NextRequest) {
  const q = requete.nextUrl.searchParams;
  try {
    const explications = await chargerExplications(await profilConnecte(), {
      lecture: q.get("lecture"),
      sourate: q.get("sourate"),
    });
    if (!explications) return Response.json({ erreur: "Indisponible." }, { status: 403 });
    return Response.json(explications, { headers: { "Cache-Control": "private, max-age=86400" } });
  } catch {
    return Response.json({ erreur: "Explication momentanément indisponible." }, { status: 502 });
  }
}

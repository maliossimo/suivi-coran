import { NextResponse, type NextRequest } from "next/server";
import { profilConnecte } from "@/repositories/profils";
import { recevoirMesure } from "@/services/securite";

/**
 * Vitesse réelle : mesures envoyées par le téléphone (sendBeacon). Une route plutôt qu'une action
 * serveur : les actions passent dans la même file que la navigation et la ralentiraient.
 */
export async function POST(requete: NextRequest) {
  // Seulement depuis l'appli elle-même.
  const origine = requete.headers.get("origin");
  if (origine && new URL(origine).host !== requete.headers.get("host")) {
    return new NextResponse(null, { status: 403 });
  }
  const mesures = (await requete.json().catch(() => null)) as unknown;
  const profil = await profilConnecte();
  const ua = requete.headers.get("user-agent") ?? "";
  if (profil && Array.isArray(mesures)) {
    for (const m of mesures.slice(0, 10)) await recevoirMesure(profil, m, ua);
  }
  return new NextResponse(null, { status: 204 });
}

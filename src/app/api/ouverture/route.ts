import { NextResponse, type NextRequest } from "next/server";
import { profilConnecte } from "@/repositories/profils";
import { signalerOuverture } from "@/services/ouvertures";
import { signalerAppareil } from "@/services/securite";

/**
 * Ouverture de l'appli (journal « qui utilise l'appli ») et appareil utilisé (nouvel appareil :
 * signalé à l'admin). Une route plutôt qu'une action serveur : elle ne retarde jamais la navigation.
 */
export async function POST(requete: NextRequest) {
  // Seulement depuis l'appli elle-même.
  const origine = requete.headers.get("origin");
  if (origine && new URL(origine).host !== requete.headers.get("host")) {
    return new NextResponse(null, { status: 403 });
  }
  const corps = (await requete.json().catch(() => null)) as { appareil?: unknown } | null;
  await signalerOuverture().catch(() => undefined);
  await signalerAppareil(await profilConnecte(), corps?.appareil, requete.headers.get("user-agent") ?? "");
  return new NextResponse(null, { status: 204 });
}

import { profilConnecte } from "@/repositories/profils";
import { jetonTajwid } from "@/services/tajwid";

export const dynamic = "force-dynamic";

/** Jeton court pour envoyer une récitation au moteur tajwid (l'audio ne passe pas par ici). */
export async function POST() {
  const jeton = jetonTajwid(await profilConnecte());
  if (!jeton) return Response.json({ erreur: "Indisponible." }, { status: 403 });
  return Response.json({ jeton }, { headers: { "Cache-Control": "no-store" } });
}

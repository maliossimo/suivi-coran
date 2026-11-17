import { timingSafeEqual } from "node:crypto";
import { mettreAJourHorairesMosquees } from "@/services/mawaqit";

/**
 * Mise à jour des horaires des mosquées depuis Mawaqit, appelée chaque nuit par Vercel (vercel.json).
 * Sans risque si quelqu'un d'autre l'appelle : chaque page n'est relue qu'une fois par mois
 * (et jamais plus d'une fois par jour). `?forcer=1` (relire tout de suite) exige CRON_SECRET.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function autorise(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const recu = Buffer.from(request.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

export async function GET(request: Request) {
  const forcer = new URL(request.url).searchParams.get("forcer") === "1";
  if (forcer && !autorise(request)) return Response.json({ erreur: "non autorisé" }, { status: 401 });
  try {
    const resultats = await mettreAJourHorairesMosquees(forcer);
    const echec = resultats.some((r) => r.etat === "erreur");
    return Response.json(
      { resultats },
      { status: echec ? 502 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("Import Mawaqit", e);
    return Response.json(
      { erreur: "import impossible" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

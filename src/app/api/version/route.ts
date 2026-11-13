import { COMMIT, VERSION } from "@/lib/version";

/** Version en ligne (déploiement) : l'appli ouverte la compare à la sienne pour se mettre à jour. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ version: VERSION, commit: COMMIT }, { headers: { "Cache-Control": "no-store" } });
}

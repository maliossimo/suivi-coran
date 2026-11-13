import type { NextRequest } from "next/server";
import { profilConnecte } from "@/repositories/profils";
import { versetPourHorsLigne } from "@/services/coran";

/** Un verset récité, pour le garder sur le téléphone (Coran hors ligne, admin). */
export async function GET(requete: NextRequest) {
  const q = requete.nextUrl.searchParams;
  return versetPourHorsLigne(await profilConnecte(), {
    dossier: q.get("dossier"),
    fichier: q.get("fichier"),
  });
}

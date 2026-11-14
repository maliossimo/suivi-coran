import type { NextRequest } from "next/server";
import { nouveauNonce, politiqueContenu } from "@/lib/securite";
import { mettreAJourSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // CSP : un jeton par page ; Next le lit dans l'en-tête de la requête et l'ajoute à ses scripts.
  const nonce = nouveauNonce();
  const csp = politiqueContenu(
    nonce,
    process.env.NODE_ENV === "development",
    request.nextUrl.protocol === "https:" || request.nextUrl.hostname !== "localhost",
  );
  const entetes = new Headers(request.headers);
  entetes.set("x-nonce", nonce);
  entetes.set("content-security-policy", csp);

  const response = await mettreAJourSession(request, entetes);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Toutes les pages sauf les fichiers fixes (scripts, images, polices, sons, service worker…) :
  // pour eux, ni session ni CSP à calculer, donc aucun aller-retour vers Supabase.
  matcher: [
    "/((?!_next/static|_next/image|polices/|icones/|sw\\.js|manifest\\.webmanifest|api/version|api/moteur_tajwid|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|mp3|json|txt|xml)$).*)",
  ],
};

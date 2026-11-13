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
  // Toutes les pages sauf les fichiers statiques et les images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

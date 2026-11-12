import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envPublic } from "@/lib/env";

/** Pages accessibles sans être connecté. */
const ROUTES_PUBLIQUES = ["/connexion", "/auth/", "/rejoindre/", "/manifest.webmanifest"];

function estPublique(chemin: string): boolean {
  return ROUTES_PUBLIQUES.some((r) => chemin === r || chemin.startsWith(r));
}

/**
 * Rafraîchit la session Supabase à chaque requête et renvoie vers la page de
 * connexion toute personne non connectée qui demande une page protégée.
 */
export async function mettreAJourSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    envPublic.NEXT_PUBLIC_SUPABASE_URL,
    envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // getUser() vérifie le jeton auprès de Supabase (ne pas se fier au seul cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !estPublique(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

import { NextResponse, type NextRequest } from "next/server";
import { TYPES_LIEN_EMAIL, verifierLienEmail, type TypeLienEmail } from "@/repositories/auth";

/** N'accepte qu'une redirection interne (évite les redirections vers un site tiers). */
function cheminInterne(valeur: string | null): string {
  return valeur && valeur.startsWith("/") && !valeur.startsWith("//") ? valeur : "/";
}

/**
 * Lien reçu par e-mail (invitation, mot de passe oublié) :
 * /auth/confirm?token_hash=…&type=invite&next=/definir-mot-de-passe
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = cheminInterne(searchParams.get("next"));

  if (tokenHash && type && (TYPES_LIEN_EMAIL as readonly string[]).includes(type)) {
    const { ok } = await verifierLienEmail(tokenHash, type as TypeLienEmail);
    if (ok) {
      // Invitation : on signale la première connexion pour proposer ensuite l'installation de l'appli.
      const cible = type === "invite" ? `${next}${next.includes("?") ? "&" : "?"}bienvenue=1` : next;
      return NextResponse.redirect(new URL(cible, request.url));
    }
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));
}

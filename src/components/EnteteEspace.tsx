import Link from "next/link";
import type { Role } from "@/domain/roles";
import { NavigationEspace } from "./NavigationEspace";

const LIBELLE_ROLE: Record<Role, string> = { eleve: "Élève", maitre: "Maître", admin: "Administrateur" };

function initiales(nom: string): string {
  const lettres = nom
    .split(/\s+/)
    .filter(Boolean)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
  return lettres.slice(0, 2) || "?";
}

/**
 * Barre du haut des espaces élève, maître et admin : logo (retour à l'accueil),
 * navigation principale et accès au compte.
 */
export function EnteteEspace({ titre, nom, role }: { titre: string; nom: string; role: Role }) {
  return (
    <header className="barre">
      <div className="barre-contenu">
        <Link href="/" className="barre-marque" aria-label="Accueil — Suivi cours Coran">
          <div className="auth-logo auth-logo-petit" aria-hidden="true">
            ق
          </div>
          <div className="barre-titres" aria-hidden="true">
            <span className="barre-app">Suivi cours Coran</span>
            <span className="barre-titre">{titre}</span>
          </div>
        </Link>
        <NavigationEspace role={role} />
        <Link href="/compte" className="barre-identite" aria-label="Mon compte">
          <span className="avatar" aria-hidden="true">
            {initiales(nom)}
          </span>
          <span className="barre-nom">
            {nom || "Mon compte"}
            <small>{LIBELLE_ROLE[role]}</small>
          </span>
        </Link>
      </div>
    </header>
  );
}

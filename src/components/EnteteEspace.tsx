import Link from "next/link";
import type { Role } from "@/domain/roles";
import { Avatar } from "./Avatar";
import { NavigationEspace } from "./NavigationEspace";
import { Salutation } from "./Salutation";

const LIBELLE_ROLE: Record<Role, string> = { eleve: "Élève", maitre: "Cheikh", admin: "Administrateur" };

/**
 * Barre du haut des espaces élève, maître et admin : logo (retour à l'accueil),
 * navigation principale et accès au compte.
 */
export function EnteteEspace({ titre, nom, role }: { titre: string; nom: string; role: Role }) {
  return (
    <>
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
            <Avatar prenom={nom} cle={nom} role={role} taille="petit" surBarre />
            <span className="barre-nom">
              {nom || "Mon compte"}
              {/* Le maître sait qu'il est maître : on n'affiche son rôle que pour l'élève et l'admin. */}
              {role === "maitre" ? null : <small>{LIBELLE_ROLE[role]}</small>}
            </span>
          </Link>
        </div>
      </header>
      <Salutation prenom={nom.split(/\s+/)[0] ?? ""} />
    </>
  );
}

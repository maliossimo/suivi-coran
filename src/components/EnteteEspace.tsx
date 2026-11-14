import Link from "next/link";
import { accueilDuRole, LIBELLE_ROLE_LONG, type Role } from "@/domain/roles";
import { Avatar } from "./Avatar";
import { LogoAccueil } from "./logo/LogoAccueil";
import { NavigationEspace } from "./NavigationEspace";
import { SignalerOuverture } from "./SignalerOuverture";
import { TitreBarre } from "./Salutation";

/**
 * Barre du haut des espaces élève, maître et admin : logo (retour à l'accueil),
 * navigation principale et accès au compte.
 */
export function EnteteEspace({ titre, nom, role }: { titre: string; nom: string; role: Role }) {
  return (
    <header className="barre">
      <SignalerOuverture />
      <div className="barre-contenu">
        <LogoAccueil accueil={accueilDuRole(role)} label="Accueil — Suivi cours Coran">
          <div className="barre-titres" aria-hidden="true">
            <span className="barre-app">Suivi cours Coran</span>
            <TitreBarre titre={titre} prenom={nom.split(/\s+/)[0] ?? ""} />
          </div>
        </LogoAccueil>
        <NavigationEspace role={role} />
        <Link href="/compte" className="barre-identite" aria-label="Mon compte">
          <Avatar prenom={nom} cle={nom} role={role} taille="petit" surBarre />
          <span className="barre-nom">
            {nom || "Mon compte"}
            {/* Le maître sait qu'il est maître : on n'affiche son rôle que pour l'élève et l'admin. */}
            {role === "maitre" ? null : <small>{LIBELLE_ROLE_LONG[role]}</small>}
          </span>
        </Link>
      </div>
    </header>
  );
}

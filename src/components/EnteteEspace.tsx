import Link from "next/link";
import { actionDeconnexion } from "@/app/actions/auth";

function initiales(nom: string): string {
  const lettres = nom
    .split(/\s+/)
    .filter(Boolean)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
  return lettres.slice(0, 2) || "?";
}

/** Barre du haut des espaces élève, maître et admin. */
export function EnteteEspace({ titre, nom, role }: { titre: string; nom: string; role: string }) {
  return (
    <header className="barre">
      <div className="barre-contenu">
        <Link href="/" className="barre-marque" aria-label="Retour à l’accueil">
          <div className="auth-logo auth-logo-petit" aria-hidden="true">
            ق
          </div>
          <div className="barre-titres">
            <span className="barre-app">Suivi cours Coran</span>
            <span className="barre-titre">{titre}</span>
          </div>
        </Link>
        <div className="barre-utilisateur">
          <Link href="/" className="bouton-accueil" aria-label="Accueil">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span className="bouton-accueil-texte">Accueil</span>
          </Link>
          <div className="barre-identite">
            <span className="avatar" aria-hidden="true">
              {initiales(nom)}
            </span>
            <span className="barre-nom">
              {nom || "Mon compte"}
              <small>{role}</small>
            </span>
          </div>
          <form action={actionDeconnexion}>
            <button className="bouton-secondaire" type="submit">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

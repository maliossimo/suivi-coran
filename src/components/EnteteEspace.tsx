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
        <div className="barre-marque">
          <div className="auth-logo auth-logo-petit" aria-hidden="true">
            ق
          </div>
          <div className="barre-titres">
            <span className="barre-app">Suivi cours Coran</span>
            <span className="barre-titre">{titre}</span>
          </div>
        </div>
        <div className="barre-utilisateur">
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

import { LogoEtoile } from "./logo/LogoEtoile";

/**
 * Mise en page des écrans d'authentification (connexion, mot de passe oublié,
 * choix du mot de passe) : un panneau décoratif à motif géométrique et un
 * panneau de formulaire. Sur téléphone, le panneau décoratif devient un bandeau.
 */
export function CadreAuth({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth">
      <section className="auth-visuel" aria-hidden="true">
        <div className="auth-visuel-contenu">
          <div className="auth-logo">
            <LogoEtoile />
          </div>
          <p className="auth-nom">Suivi cours Coran</p>
        </div>
      </section>

      <section className="auth-panneau">
        <div className="auth-boite">
          <header className="auth-entete">
            <div className="auth-logo auth-logo-petit" aria-hidden="true">
              <LogoEtoile surVert={false} />
            </div>
            <h1>{titre}</h1>
            {sousTitre ? <p>{sousTitre}</p> : null}
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}

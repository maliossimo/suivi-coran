import { LIBELLE_VERSION } from "@/lib/version";
import { LogoEtoile } from "./logo/LogoEtoile";

/**
 * Mise en page des écrans d'authentification (connexion, mot de passe oublié,
 * choix du mot de passe) : un panneau décoratif à motif géométrique et un
 * panneau de formulaire. Sur téléphone, le panneau décoratif devient un bandeau.
 */
export function CadreAuth({
  titre,
  sousTitre,
  fete = false,
  children,
}: {
  titre: string;
  sousTitre?: string;
  /** Écran de bienvenue : le logo s'anime et des étoiles s'envolent. */
  fete?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className={fete ? "auth auth-fete" : "auth"}>
      <section className="auth-visuel" aria-hidden="true">
        <div className="auth-visuel-contenu">
          <div className="auth-logo">
            <LogoEtoile />
          </div>
          <p className="auth-nom">Suivi cours Coran</p>
          <p className="auth-hadith">
            <span className="arabe" lang="ar" dir="rtl">
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </span>
            <small>« Le meilleur d’entre vous est celui qui apprend le Coran et l’enseigne. »</small>
          </p>
          <ul className="auth-atouts">
            <li>Ta fiche du mois, apprentissage et révision</li>
            <li>Le Coran à lire, écouter et réciter</li>
            <li>Le suivi bienveillant de ton Cheikh</li>
          </ul>
        </div>
        <span className="auth-etincelles">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
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
          <p className="auth-version">{LIBELLE_VERSION}</p>
        </div>
      </section>
    </main>
  );
}

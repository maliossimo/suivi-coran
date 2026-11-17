import { DateHegirienneBarre } from "./DateHegirienne";
import Link from "next/link";
import { LogoEtoile } from "./logo/LogoEtoile";
/**
 * Écran affiché instantanément pendant le chargement d'une page :
 * même barre du haut et silhouettes des cartes, pour que la navigation
 * paraisse immédiate même quand la base met un peu de temps à répondre.
 */
export function Chargement({
  titre,
  coran = false,
  forme = "cartes",
}: {
  titre: string;
  coran?: boolean;
  /** Silhouette de la page attendue : la fiche du mois, une liste (élèves, classes) ou des cartes. */
  forme?: "fiche" | "liste" | "cartes";
}) {
  return (
    <>
      <header className="barre">
        <div className="barre-contenu">
          <Link href="/" className="barre-marque" aria-label="Retour à l’accueil">
            <span className="barre-logo" aria-hidden="true">
              <LogoEtoile />
            </span>
            <div className="barre-titres">
              <DateHegirienneBarre />
              <span className="barre-titre">{titre}</span>
            </div>
          </Link>
        </div>
      </header>
      <main className="espace" aria-busy="true" aria-live="polite">
        <span className="visuellement-cache">Chargement…</span>
        {coran ? (
          // Lecture du Coran : la barre de la sourate puis des lignes de texte, de droite à gauche.
          <div className="squelette-coran">
            <div className="squelette squelette-ligne" />
            {[92, 100, 84, 97, 76, 100, 88].map((l, i) => (
              <div key={i} className="squelette squelette-verset" style={{ width: `${l}%` }} />
            ))}
          </div>
        ) : forme === "fiche" ? (
          // La fiche : le mois, les deux onglets, le résumé, puis les semaines et leurs jours.
          <div className="squelette-page">
            <div className="squelette-mois">
              <div className="squelette squelette-rond" />
              <div className="squelette squelette-titre" />
              <div className="squelette squelette-rond" />
            </div>
            <div className="squelette squelette-onglets" />
            <div className="squelette-pastilles">
              {[96, 120, 84].map((l, i) => (
                <div key={i} className="squelette squelette-pastille" style={{ width: l }} />
              ))}
            </div>
            {[0, 1].map((s) => (
              <div key={s} className="squelette-semaine">
                <div className="squelette squelette-texte" style={{ width: "38%" }} />
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="squelette squelette-jour" />
                ))}
              </div>
            ))}
          </div>
        ) : forme === "liste" ? (
          // Une liste : la recherche, puis des cartes avec avatar, nom et chiffres.
          <div className="squelette-page">
            <div className="squelette squelette-recherche" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="squelette-element">
                <div className="squelette squelette-avatar" />
                <div className="squelette-lignes">
                  <div className="squelette squelette-texte" style={{ width: `${60 - i * 6}%` }} />
                  <div className="squelette squelette-texte squelette-texte-petit" style={{ width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="squelette squelette-ligne" />
            <div className="squelette squelette-onglets" />
            <div className="squelette-grille">
              <div className="squelette squelette-carte" />
              <div className="squelette squelette-carte" />
            </div>
          </>
        )}
      </main>
    </>
  );
}

/** Silhouettes de contenu, à placer dans un <Suspense> pendant qu'une partie de la page charge. */
export function Squelettes({ cartes = 2, tuiles = true }: { cartes?: number; tuiles?: boolean }) {
  return (
    <div className="squelettes" aria-busy="true">
      <span className="visuellement-cache">Chargement…</span>
      {tuiles ? <div className="squelette squelette-tuiles" /> : null}
      <div className="squelette-grille">
        {Array.from({ length: cartes }, (_, i) => (
          <div key={i} className="squelette squelette-carte" />
        ))}
      </div>
    </div>
  );
}

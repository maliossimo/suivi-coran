/**
 * Écran affiché instantanément pendant le chargement d'une page :
 * même barre du haut et silhouettes des cartes, pour que la navigation
 * paraisse immédiate même quand la base met un peu de temps à répondre.
 */
export function Chargement({ titre }: { titre: string }) {
  return (
    <>
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
        </div>
      </header>
      <main className="espace" aria-busy="true" aria-live="polite">
        <span className="visuellement-cache">Chargement…</span>
        <div className="squelette squelette-ligne" />
        <div className="squelette squelette-onglets" />
        <div className="squelette-grille">
          <div className="squelette squelette-carte" />
          <div className="squelette squelette-carte" />
        </div>
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

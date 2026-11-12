/**
 * Anneau de progression (0 à 100 %) avec la valeur au centre.
 * Avec `pourcentageVu`, deux teintes : foncé = vu par le Cheikh, clair = seulement saisi.
 */
export function AnneauProgression({
  pourcentage,
  taille = 76,
  epaisseur = 8,
  libelle,
  texte,
  pourcentageVu,
}: {
  pourcentage: number;
  pourcentageVu?: number;
  taille?: number;
  epaisseur?: number;
  /** Lecture d'écran, ex. « 0,1 % du Coran ». */
  libelle: string;
  /** Texte au centre ; par défaut le pourcentage arrondi. */
  texte?: string;
}) {
  const p = Math.max(0, Math.min(100, pourcentage));
  const r = (taille - epaisseur) / 2;
  const tour = 2 * Math.PI * r;
  // Une valeur non nulle reste visible même minuscule (ex. 0,1 % du Coran).
  const visible = p > 0 ? Math.max(p, 1.5) : 0;
  const deuxTeintes = pourcentageVu !== undefined && pourcentageVu < p;
  const vu = Math.max(0, Math.min(p, pourcentageVu ?? p));
  const vuVisible = vu > 0 ? Math.max(vu, 1.5) : 0;
  const arc = (valeur: number, classe: string) => (
    <circle
      cx={taille / 2}
      cy={taille / 2}
      r={r}
      className={classe}
      strokeWidth={epaisseur}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={`${(valeur / 100) * tour} ${tour}`}
      transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
    />
  );
  return (
    <svg
      width={taille}
      height={taille}
      viewBox={`0 0 ${taille} ${taille}`}
      role="img"
      aria-label={libelle}
      className="anneau"
    >
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={r}
        className="anneau-fond"
        strokeWidth={epaisseur}
        fill="none"
      />
      {deuxTeintes ? (
        <>
          {arc(visible, "anneau-valeur anneau-declare")}
          {vuVisible > 0 ? arc(vuVisible, "anneau-valeur") : null}
        </>
      ) : (
        arc(visible, "anneau-valeur")
      )}
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="anneau-texte">
        {texte ?? `${Math.round(p)} %`}
      </text>
    </svg>
  );
}

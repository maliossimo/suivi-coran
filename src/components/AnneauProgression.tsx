/** Anneau de progression (0 à 100 %) avec la valeur au centre. */
export function AnneauProgression({
  pourcentage,
  taille = 76,
  epaisseur = 8,
  libelle,
  texte,
}: {
  pourcentage: number;
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
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={r}
        className="anneau-valeur"
        strokeWidth={epaisseur}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(visible / 100) * tour} ${tour}`}
        transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="anneau-texte">
        {texte ?? `${Math.round(p)} %`}
      </text>
    </svg>
  );
}

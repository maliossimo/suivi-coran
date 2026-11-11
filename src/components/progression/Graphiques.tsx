import { formaterDuree, libelleJourCourt } from "@/domain/fiche";
import type { BarreSemaine, CaseRegularite, PointMois } from "@/domain/progression";

/*
 * Graphiques en SVG, rendus côté serveur : aucune bibliothèque, rien à
 * télécharger, lisibles sur téléphone (viewBox + largeur 100 %).
 * Couleurs : vert = apprentissage, or = révision.
 */

const VERT = "#1d5c47";
const OR = "#c9a24a";
const GRILLE = "#ece8de";
const TEXTE = "#5b6660";

function arrondiHaut(valeur: number): number {
  if (valeur <= 10) return 10;
  const puissance = 10 ** Math.floor(Math.log10(valeur));
  return Math.ceil(valeur / puissance) * puissance;
}

/** Courbe cumulée des versets appris, mois par mois. */
export function GraphiqueCumul({ points }: { points: PointMois[] }) {
  const L = 600;
  const H = 220;
  const marge = { haut: 16, droite: 16, bas: 28, gauche: 40 };
  const max = arrondiHaut(Math.max(...points.map((p) => p.valeur), 1));
  const x = (i: number) =>
    marge.gauche + (i * (L - marge.gauche - marge.droite)) / Math.max(points.length - 1, 1);
  const y = (v: number) => H - marge.bas - (v / max) * (H - marge.haut - marge.bas);
  const ligne = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.valeur)}`).join(" ");
  const aire = `${ligne} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const derniere = points.at(-1);

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      className="graphique"
      role="img"
      aria-label={`Versets appris en cumul : ${points.map((p) => `${p.libelle} ${p.valeur}`).join(", ")}`}
    >
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={marge.gauche} x2={L - marge.droite} y1={y(max * t)} y2={y(max * t)} stroke={GRILLE} />
          <text x={marge.gauche - 8} y={y(max * t) + 4} textAnchor="end" fontSize="12" fill={TEXTE}>
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      <path d={aire} fill={VERT} opacity="0.1" />
      <path
        d={ligne}
        fill="none"
        stroke={VERT}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <g key={p.cle}>
          <circle cx={x(i)} cy={y(p.valeur)} r={i === points.length - 1 ? 5 : 3} fill={VERT} />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill={TEXTE}>
            {p.libelle}
          </text>
        </g>
      ))}
      {derniere ? (
        <text
          x={x(points.length - 1) - 8}
          y={y(derniere.valeur) - 10}
          textAnchor="end"
          fontSize="13"
          fontWeight="700"
          fill={VERT}
        >
          {derniere.valeur} versets
        </text>
      ) : null}
    </svg>
  );
}

/** Barres empilées : minutes d'apprentissage et de révision par semaine. */
export function GraphiqueSemaines({ barres }: { barres: BarreSemaine[] }) {
  const L = 600;
  const H = 220;
  const marge = { haut: 16, droite: 8, bas: 28, gauche: 40 };
  const max = arrondiHaut(Math.max(...barres.map((b) => b.apprentissage + b.revision), 1));
  const pas = (L - marge.gauche - marge.droite) / barres.length;
  const largeur = Math.min(28, pas * 0.6);
  const h = (v: number) => (v / max) * (H - marge.haut - marge.bas);
  const base = H - marge.bas;

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      className="graphique"
      role="img"
      aria-label={`Minutes par semaine : ${barres
        .map(
          (b) =>
            `semaine du ${b.libelle}, ${b.apprentissage} min d'apprentissage et ${b.revision} min de révision`,
        )
        .join(" ; ")}`}
    >
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1={marge.gauche}
            x2={L - marge.droite}
            y1={base - h(max * t)}
            y2={base - h(max * t)}
            stroke={GRILLE}
          />
          <text x={marge.gauche - 8} y={base - h(max * t) + 4} textAnchor="end" fontSize="12" fill={TEXTE}>
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      {barres.map((b, i) => {
        const cx = marge.gauche + pas * i + pas / 2;
        return (
          <g key={b.debut}>
            <rect
              x={cx - largeur / 2}
              y={base - h(b.apprentissage)}
              width={largeur}
              height={h(b.apprentissage)}
              fill={VERT}
              rx="3"
            />
            <rect
              x={cx - largeur / 2}
              y={base - h(b.apprentissage) - h(b.revision)}
              width={largeur}
              height={h(b.revision)}
              fill={OR}
              rx="3"
            />
            {i % 2 === barres.length % 2 ? null : (
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={TEXTE}>
                {b.libelle}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
// Teintes définies en CSS (--teinte-0 à 3) : contrastées en mode clair comme en mode sombre.
const TEINTES = [0, 1, 2, 3].map((n) => `var(--teinte-${n})`);

/** Grille de régularité : une colonne par semaine, une case par jour. */
export function GrilleRegularite({ colonnes }: { colonnes: CaseRegularite[][] }) {
  const C = 18;
  const E = 4;
  const L = 24 + colonnes.length * (C + E);
  const H = 7 * (C + E);
  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      className="graphique graphique-grille"
      role="img"
      aria-label="Régularité des 12 dernières semaines"
    >
      {JOURS.map((j, l) =>
        l % 2 === 0 ? (
          <text key={l} x={0} y={l * (C + E) + C - 4} fontSize="11" fill={TEXTE}>
            {j}
          </text>
        ) : null,
      )}
      {colonnes.map((colonne, c) =>
        colonne.map((jour, l) => (
          <rect
            key={jour.date}
            x={24 + c * (C + E)}
            y={l * (C + E)}
            width={C}
            height={C}
            rx="4"
            className={jour.futur ? "case-future" : `teinte-${jour.niveau}`}
            fill={jour.futur ? "transparent" : TEINTES[jour.niveau]}
            stroke={jour.futur ? GRILLE : "none"}
            strokeDasharray={jour.futur ? "3 3" : undefined}
          >
            <title>
              {libelleJourCourt(jour.date)} : {jour.minutes ? formaterDuree(jour.minutes) : "pas de séance"}
            </title>
          </rect>
        )),
      )}
    </svg>
  );
}

export function LegendeTeintes() {
  return (
    <span className="legende">
      Moins
      {TEINTES.map((t) => (
        <span key={t} className="legende-case" style={{ background: t }} />
      ))}
      Plus
    </span>
  );
}

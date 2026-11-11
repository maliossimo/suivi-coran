import type { SemaineUsage } from "@/domain/usage";

const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function libelle(date: string): string {
  const [, m, j] = date.split("-").map(Number);
  return `${j} ${MOIS[(m ?? 1) - 1]}`;
}

/** Séances saisies par semaine (12 semaines), avec le nombre d'élèves actifs. */
export function GraphiqueUsage({ semaines }: { semaines: SemaineUsage[] }) {
  const L = 600;
  const H = 200;
  const marge = { haut: 18, droite: 8, bas: 26, gauche: 8 };
  const max = Math.max(1, ...semaines.map((s) => s.seances));
  const pas = (L - marge.gauche - marge.droite) / semaines.length;
  const largeur = Math.min(30, pas * 0.62);
  const base = H - marge.bas;
  const h = (v: number) => (v / max) * (base - marge.haut);

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      className="graphique"
      role="img"
      aria-label={`Séances par semaine : ${semaines
        .map((s) => `semaine du ${libelle(s.debut)}, ${s.seances} séances par ${s.eleves} élèves`)
        .join(" ; ")}`}
    >
      <line x1={marge.gauche} x2={L - marge.droite} y1={base} y2={base} stroke="#d9d4c7" />
      {semaines.map((s, i) => {
        const x = marge.gauche + i * pas + (pas - largeur) / 2;
        const courante = i === semaines.length - 1;
        return (
          <g key={s.debut}>
            <rect
              x={x}
              y={base - h(s.seances)}
              width={largeur}
              height={Math.max(h(s.seances), s.seances ? 2 : 0)}
              rx={4}
              fill={courante ? "#c9922e" : "#1d5c47"}
            />
            {s.seances ? (
              <text
                x={x + largeur / 2}
                y={base - h(s.seances) - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#4a544f"
              >
                {s.seances}
              </text>
            ) : null}
            {i % 2 === semaines.length % 2 || courante ? (
              <text x={x + largeur / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#7a827d">
                {libelle(s.debut)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

import { QAF_CORPS, QAF_POINTS, transformeQaf } from "./qaf";

/**
 * Le logo du site : étoile à 8 branches or et ق.
 * `surVert` : ق crème (sur la barre ou un fond vert) ; sinon ق vert (sur fond clair).
 */
export function LogoEtoile({ surVert = true, className }: { surVert?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`logo-etoile ${surVert ? "logo-sur-vert" : "logo-sur-clair"} ${className ?? ""}`}
    >
      <g className="logo-etoile-branches">
        <rect x="24" y="24" width="152" height="152" />
        <rect x="24" y="24" width="152" height="152" transform="rotate(45 100 100)" />
      </g>
      <g className="logo-etoile-lettre">
        <g transform={transformeQaf(104, 98)}>
          <path d={QAF_CORPS} />
          <path d={QAF_POINTS} />
        </g>
      </g>
    </svg>
  );
}

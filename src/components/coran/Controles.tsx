import type { ReactNode } from "react";

/** Petits contrôles des feuilles du Coran : choix en pastilles et interrupteur. */

export function Choix<T extends number>({
  libelle,
  valeurs,
  valeur,
  afficher,
  onChange,
}: {
  libelle: string;
  valeurs: readonly T[];
  valeur: T;
  afficher: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="coran-reglage">
      <span>{libelle}</span>
      <div className="coran-choix-ligne" role="group" aria-label={libelle}>
        {valeurs.map((v) => (
          <button key={v} type="button" aria-pressed={valeur === v} onClick={() => onChange(v)}>
            {afficher(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Interrupteur({
  icone,
  libelle,
  actif,
  desactive = false,
  onChange,
}: {
  icone: ReactNode;
  libelle: string;
  actif: boolean;
  desactive?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={desactive}
      className="coran-interrupteur"
      onClick={() => onChange(!actif)}
    >
      {icone}
      <span>{libelle}</span>
      <span className="coran-interrupteur-pastille" aria-hidden="true" />
    </button>
  );
}

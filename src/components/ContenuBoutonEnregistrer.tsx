"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Texte d'un bouton « Enregistrer » : « Enregistrement… » pendant l'envoi, puis une coche qui se
 * dessine (« Enregistré ») pendant 1,6 s quand l'envoi s'est bien passé, puis le libellé revient.
 */
export function ContenuBoutonEnregistrer({
  enCours,
  libelle,
  echec = false,
}: {
  enCours: boolean;
  libelle: string;
  /** L'envoi a échoué (message d'erreur affiché) : pas de coche. */
  echec?: boolean;
}) {
  const avant = useRef(enCours);
  const [reussi, setReussi] = useState(false);
  useEffect(() => {
    const etaitEnCours = avant.current;
    avant.current = enCours;
    if (!etaitEnCours || enCours || echec) return;
    setReussi(true);
    const t = window.setTimeout(() => setReussi(false), 1600);
    return () => window.clearTimeout(t);
  }, [enCours, echec]);

  if (enCours) return <>Enregistrement…</>;
  if (reussi) {
    return (
      <span className="bouton-coche" role="status">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M5 12.5l4.2 4.2L19 7" pathLength={1} />
        </svg>
        Enregistré
      </span>
    );
  }
  return <>{libelle}</>;
}

"use client";

import { IndicateurGlissant } from "@/components/IndicateurGlissant";
import { Eye, PencilLine } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { actionModeVueAdmin } from "@/app/actions/admin";

/**
 * Bandeau « Vue du Cheikh » : le passage de « Lecture seule » à « Modifier » (et retour) est
 * immédiat à l'écran ; le choix est enregistré en arrière-plan pour les pages suivantes.
 */
export function ZoneVueAdmin({
  modificationInitiale,
  classe,
  children,
}: {
  modificationInitiale: boolean;
  classe?: string;
  children: ReactNode;
}) {
  const [modification, setModification] = useState(modificationInitiale);
  const [, demarrer] = useTransition();

  const choisir = (m: boolean) => {
    if (m === modification) return;
    setModification(m);
    const form = new FormData();
    form.set("mode", m ? "modification" : "lecture");
    demarrer(() => actionModeVueAdmin(form));
  };

  return (
    <>
      <div className={modification ? "bandeau-vue-admin modification" : "bandeau-vue-admin"} role="status">
        <p>
          {modification ? <PencilLine size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span>Vue du Cheikh{classe ? ` · ${classe}` : ""}</span>
          <Link href="/admin">Administration</Link>
        </p>
        <div className="choix-mode-admin" role="group" aria-label="Mode">
          <IndicateurGlissant id="vue-admin" actif='[aria-pressed="true"]' valeur={String(modification)} />
          <button type="button" aria-pressed={!modification} onClick={() => choisir(false)}>
            Lecture seule
          </button>
          <button type="button" aria-pressed={modification} onClick={() => choisir(true)}>
            Modifier
          </button>
        </div>
      </div>
      <fieldset disabled={!modification} className={modification ? "vue-admin-modifiable" : "lecture-seule"}>
        {children}
      </fieldset>
    </>
  );
}

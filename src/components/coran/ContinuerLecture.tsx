"use client";

import { BookOpenText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { lireDerniereLecture, type DerniereLecture } from "./derniereLecture";

/** « il y a 5 min », « hier », « il y a 3 jours » */
function depuis(quand: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - quand) / 60_000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} jours`;
}

/**
 * Onglet Coran de l'élève : rouvre en un toucher la dernière page lue sur ce téléphone.
 * Rien tant que l'élève n'a rien lu.
 */
export function ContinuerLecture() {
  const [derniere, setDerniere] = useState<DerniereLecture | null>(null);
  // Lu avant que la page s'affiche : la carte est là d'emblée, rien ne se décale ensuite.
  useLayoutEffect(() => setDerniere(lireDerniereLecture()), []);
  if (!derniere) return null;
  return (
    <Link href={derniere.adresse} className="continuer-lecture">
      <span className="continuer-lecture-icone" aria-hidden="true">
        <BookOpenText size={22} />
      </span>
      <span className="continuer-lecture-texte">
        <small>Continuer la lecture</small>
        <b>{derniere.titre}</b>
        <small>Lu {depuis(derniere.quand)}</small>
      </span>
      <ChevronRight size={20} aria-hidden="true" className="continuer-lecture-fleche" />
    </Link>
  );
}

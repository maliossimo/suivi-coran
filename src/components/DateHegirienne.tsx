import type { ElementType } from "react";
import { moisHegiriensDuMois } from "@/domain/hegire";

/**
 * Titre d'un mois avec, dessous, les mois hégiriens qu'il couvre (phonétique et arabe) :
 * « Novembre 2026 » / « Joumada al-oula – ath-thania 1448 · جمادى الأولى – الآخرة ١٤٤٨ هـ ».
 */
export function TitreMoisDouble({
  annee,
  mois,
  libelle,
  as: Titre = "h2",
}: {
  annee: number;
  mois: number;
  libelle: string;
  as?: ElementType;
}) {
  const h = moisHegiriensDuMois(annee, mois);
  return (
    <div className="mois-titres">
      <Titre className="mois-titre">{libelle}</Titre>
      {h ? (
        <p className="mois-hegire">
          {h.fr}
          <span className="mois-hegire-sep"> · </span>
          <span className="mois-hegire-ar" lang="ar" dir="rtl">
            {h.ar}
          </span>
        </p>
      ) : null}
    </div>
  );
}

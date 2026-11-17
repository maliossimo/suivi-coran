import type { ElementType } from "react";
import { dateHegirienne, libelleHegirien, libelleHegirienArabe, moisHegiriensDuMois } from "@/domain/hegire";

/** Jour d'aujourd'hui à Paris (AAAA-MM-JJ). */
function aujourdhui(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * Les deux dates du jour dans la barre du haut (tous les profils) :
 * « Mar. 17 nov. · 7 Joumada ath-thania 1448 », et l'arabe sur les écrans larges.
 */
export function DateHegirienneBarre() {
  const jour = aujourdhui();
  const d = dateHegirienne(jour);
  const francais = JOUR_COURT.format(new Date(`${jour}T12:00:00Z`)).replace(/^./, (c) => c.toUpperCase());
  if (!d) return <span className="barre-app">{francais}</span>;
  return (
    <span className="barre-app barre-hegire" title={libelleHegirienArabe(d)} suppressHydrationWarning>
      {francais} · {libelleHegirien(d)}
      <span className="barre-hegire-ar" lang="ar" dir="rtl">
        {" · "}
        {libelleHegirienArabe(d)}
      </span>
    </span>
  );
}

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

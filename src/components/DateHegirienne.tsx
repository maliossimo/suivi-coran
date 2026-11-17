import type { ElementType } from "react";
import { dateHegirienne, libelleHegirien, libelleHegirienArabe, moisHegiriensDuMois } from "@/domain/hegire";

/** Jour d'aujourd'hui à Paris (AAAA-MM-JJ). */
function aujourdhui(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

const JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Les dates du jour dans la barre du haut (tous les profils) :
 * « Mar. 17 nov. 2026 · 7 Joumada ath-thania 1448 · ٧ جمادى الآخرة ١٤٤٨ هـ ».
 * Sur téléphone : sans le jour de la semaine, et l'arabe sur sa propre ligne.
 */
export function DateHegirienneBarre() {
  const jour = aujourdhui();
  const midi = new Date(`${jour}T12:00:00Z`);
  const semaine = JOUR_SEMAINE.format(midi).replace(/^./, (c) => c.toUpperCase());
  const francais = JOUR_COURT.format(midi);
  const d = dateHegirienne(jour);
  return (
    <span className="barre-app barre-hegire" suppressHydrationWarning>
      <span className="barre-semaine">{semaine} </span>
      {francais}
      {d ? (
        <>
          {" · "}
          {libelleHegirien(d)}
          <span className="barre-hegire-sep"> · </span>
          <span className="barre-hegire-ar" lang="ar" dir="rtl">
            {libelleHegirienArabe(d)}
          </span>
        </>
      ) : null}
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

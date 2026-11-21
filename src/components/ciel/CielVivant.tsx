"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  LIBELLE_JOUR_PARTICULIER,
  momentDuCiel,
  phaseDeNuit,
  positionAstre,
  positionAstreFigee,
  tempsDePriere,
  type CielFige,
  type JourParticulier,
  type MomentCiel,
  type PhaseNuit,
} from "@/domain/ciel";
import { minutesParis, type HorairesPriere } from "@/domain/priere";
import { astreSvg, DEFS_SVG, FOND_SVG, luneDevantSvg, miniSvg, VILLE_SVG } from "./dessin";

export interface CielProps {
  horaires: HorairesPriere;
  jourHegire: number | null;
  particulier: JourParticulier | null;
  /** Minutes depuis minuit à Paris, au moment du rendu serveur (même valeur à l'hydratation). */
  maintenant: number;
}

/**
 * Tests visuels : window.__cielFixe (ou <html data-ciel-fixe>) fige le ciel : un moment (« fajr », « jour »,
 * « maghrib », « nuit ») ou un temps de la nuit (« nuit-profonde », « tahajjud »), sans lune ni fête.
 */
function cielFixe(): CielFige | null {
  if (typeof window === "undefined") return null;
  const v =
    (window as unknown as { __cielFixe?: string }).__cielFixe ?? document.documentElement.dataset.cielFixe;
  return v === "fajr" ||
    v === "jour" ||
    v === "maghrib" ||
    v === "nuit" ||
    v === "nuit-profonde" ||
    v === "tahajjud"
    ? v
    : null;
}

/** L'heure de Paris, revue chaque minute. */
function useMinutes(initiales: number): { minutes: number; fixe: CielFige | null } {
  const [minutes, setMinutes] = useState(initiales);
  const [fixe, setFixe] = useState<CielFige | null>(null);
  useEffect(() => {
    const f = cielFixe();
    if (f) {
      setFixe(f);
      return;
    }
    const maj = () => setMinutes(minutesParis(new Date()));
    maj();
    const t = window.setInterval(maj, 60_000);
    return () => window.clearInterval(t);
  }, []);
  return { minutes, fixe };
}

/** Le moment de la journée et, la nuit, son temps (profonde ou dernier tiers) : d'après l'heure, ou figés. */
function etatDuCiel(
  minutes: number,
  horaires: HorairesPriere,
  fixe: CielFige | null,
): { moment: MomentCiel; nuit: PhaseNuit | null } {
  if (fixe === "tahajjud") return { moment: "nuit", nuit: "tahajjud" };
  if (fixe === "nuit" || fixe === "nuit-profonde") return { moment: "nuit", nuit: "profonde" };
  if (fixe) return { moment: fixe, nuit: null };
  return { moment: momentDuCiel(minutes, horaires), nuit: phaseDeNuit(minutes, horaires) };
}

const ID_BARRE_ETAT = "theme-color-ciel";

/**
 * Barre d'état du téléphone (heure, batterie) : la couleur du ciel du moment, pour que le ciel monte
 * jusqu'en haut de l'écran. Notre balise theme-color est placée en tête (le navigateur prend la première) ;
 * elle suit aussi le passage du mode clair au mode sombre.
 */
function useBarreEtatDuCiel(
  ciel: RefObject<HTMLDivElement | null>,
  moment: MomentCiel,
  nuit: PhaseNuit | null,
) {
  useEffect(() => {
    const el = ciel.current;
    if (!el) return;
    const appliquer = () => {
      const style = getComputedStyle(el);
      // Barre d'état : le haut du ciel ; fondu sous la barre : l'horizon.
      const couleur = (style.getPropertyValue("--ciel-haut") || style.getPropertyValue("--ciel")).trim();
      // Le fondu part de la couleur exacte du sol de la ville (variable, pas la couleur affichée, qui glisse
      // pendant le fondu d'un moment à l'autre) : aucune marche visible.
      const horizon = style.getPropertyValue("--ville").trim() || style.getPropertyValue("--ciel").trim();
      if (!couleur) return;
      let balise = document.getElementById(ID_BARRE_ETAT) as HTMLMetaElement | null;
      if (!balise) {
        balise = document.createElement("meta");
        balise.id = ID_BARRE_ETAT;
        balise.name = "theme-color";
      }
      if (document.head.firstElementChild !== balise) document.head.prepend(balise);
      balise.content = couleur;
      // Le fondu sous la barre (ciel-fondu) prend la même couleur.
      document.documentElement.style.setProperty("--ciel-actuel", horizon || couleur);
      // Toute la page prend l'ambiance du moment (aube rosée, Maghrib ambré, nuit, jour).
      document.documentElement.dataset.moment = moment;
      // Nuit profonde ou dernier tiers : le thème sombre devient encore plus sombre (voir globals.css).
      if (nuit) document.documentElement.dataset.nuit = nuit;
      else delete document.documentElement.dataset.nuit;
    };
    appliquer();
    const schema = matchMedia("(prefers-color-scheme: dark)");
    schema.addEventListener("change", appliquer);
    const observateur = new MutationObserver(appliquer);
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      schema.removeEventListener("change", appliquer);
      observateur.disconnect();
    };
  }, [ciel, moment, nuit]);
}

/**
 * Décor vivant de la barre du haut : le ciel suit les vraies heures de prière de la mosquée
 * (aube, jour, coucher, nuit en deux temps), le soleil et la lune traversent le ciel aux heures
 * réelles, la lune suit le mois hégirien, les jours particuliers s'y voient (vendredi, jours
 * blancs, Ramadan, Aïd). Tout bouge lentement ; rien si le téléphone demande moins d'animations.
 * Purement décoratif (masqué aux lecteurs d'écran). Le dessin est dans ./dessin.
 */
export function CielDecor({ horaires, jourHegire, particulier, maintenant }: CielProps) {
  const { minutes, fixe } = useMinutes(maintenant);
  const ciel = useRef<HTMLDivElement>(null);
  const { moment, nuit } = etatDuCiel(minutes, horaires, fixe);
  const fete = fixe ? null : particulier;
  useBarreEtatDuCiel(ciel, moment, nuit);
  // Seul l'astre est redessiné (chaque minute) ; étoiles et ville ne changent jamais.
  const position = fixe ? positionAstreFigee(fixe) : positionAstre(minutes, horaires);
  const jour = fixe ? null : jourHegire;
  const astre = astreSvg({ position, jourHegire: jour, ramadan: fete === "ramadan" });
  const luneDevant = luneDevantSvg({ position, jourHegire: jour });
  return (
    <div
      ref={ciel}
      className="ciel"
      data-moment={moment}
      data-nuit={nuit ?? undefined}
      data-particulier={fete ?? undefined}
      aria-hidden="true"
    >
      <div className="ciel-motif" />
      <svg className="cv-defs" dangerouslySetInnerHTML={{ __html: DEFS_SVG }} />
      <svg className="ciel-scene" viewBox="0 0 360 138" dangerouslySetInnerHTML={{ __html: FOND_SVG }} />
      <svg className="ciel-scene" viewBox="0 0 360 138" dangerouslySetInnerHTML={{ __html: astre }} />
      <svg className="ciel-scene" viewBox="0 0 360 138" dangerouslySetInnerHTML={{ __html: VILLE_SVG }} />
      {/* Le disque de la lune passe devant la ville : un minaret ne la cache plus. */}
      <svg className="ciel-scene" viewBox="0 0 360 138" dangerouslySetInnerHTML={{ __html: luneDevant }} />
      <div className="cv-terre" />
    </div>
  );
}

/**
 * Ciel en miniature pour l'en-tête compact (quand on descend dans la page) : même moment, mêmes couleurs,
 * le même astre (lune du mois ou soleil) et la ville en petit, calée à droite.
 * Les dégradés du soleil et de la lune viennent du grand ciel, toujours présent dans la barre.
 */
export function CielMini({ horaires, jourHegire, maintenant }: CielProps) {
  const { minutes, fixe } = useMinutes(maintenant);
  const { moment, nuit } = etatDuCiel(minutes, horaires, fixe);
  return (
    <div className="ciel ciel-mini" data-moment={moment} data-nuit={nuit ?? undefined} aria-hidden="true">
      <div className="ciel-motif" />
      <div className="ciel-mini-terre" />
      <svg
        className="ciel-mini-scene"
        viewBox="0 0 220 64"
        preserveAspectRatio="xMaxYMax meet"
        dangerouslySetInnerHTML={{ __html: miniSvg(moment, fixe ? null : jourHegire) }}
      />
    </div>
  );
}

/** Ligne des dates sous le titre : jour français · temps de prière (ou jour particulier) | date hégirienne. */
export function CielDates({
  horaires,
  particulier,
  maintenant,
  dateFrancaise,
  dateHegirienneArabe,
  source,
}: CielProps & { dateFrancaise: string; dateHegirienneArabe: string | null; source?: "mosquee" | "calcul" }) {
  const { minutes, fixe } = useMinutes(maintenant);
  const fete = fixe ? null : particulier;
  return (
    <p className="barre-dates">
      <span className="barre-dates-fr">
        {dateFrancaise}{" "}
        <span className="barre-dates-temps" lang="ar" dir="rtl">
          {fete ? LIBELLE_JOUR_PARTICULIER[fete] : tempsDePriere(minutes, horaires)}
        </span>
        {source === "calcul" ? (
          <abbr
            className="barre-dates-calcul"
            title="Heures calculées : le calendrier de la mosquée n'est pas importé"
          >
            ≈
          </abbr>
        ) : null}
      </span>
      {dateHegirienneArabe ? (
        <span className="barre-dates-hegire" lang="ar" dir="rtl">
          {dateHegirienneArabe}
        </span>
      ) : null}
    </p>
  );
}

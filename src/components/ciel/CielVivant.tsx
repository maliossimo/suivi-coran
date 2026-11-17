"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  LIBELLE_JOUR_PARTICULIER,
  momentDuCiel,
  phaseLune,
  tempsDePriere,
  type JourParticulier,
  type MomentCiel,
} from "@/domain/ciel";
import { minutesParis, type HorairesPriere } from "@/domain/priere";

export interface CielProps {
  horaires: HorairesPriere;
  jourHegire: number | null;
  particulier: JourParticulier | null;
  /** Minutes depuis minuit à Paris, au moment du rendu serveur (même valeur à l'hydratation). */
  maintenant: number;
}

/** Tests visuels : window.__cielFixe (ou <html data-ciel-fixe>) fige le ciel (moment donné, ni lune ni fête). */
function cielFixe(): MomentCiel | null {
  if (typeof window === "undefined") return null;
  const v =
    (window as unknown as { __cielFixe?: string }).__cielFixe ?? document.documentElement.dataset.cielFixe;
  return v === "fajr" || v === "jour" || v === "maghrib" || v === "nuit" ? v : null;
}

/** L'heure de Paris, revue chaque minute. */
function useMinutes(initiales: number): { minutes: number; fixe: MomentCiel | null } {
  const [minutes, setMinutes] = useState(initiales);
  const [fixe, setFixe] = useState<MomentCiel | null>(null);
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

const ID_BARRE_ETAT = "theme-color-ciel";

/**
 * Barre d'état du téléphone (heure, batterie) : la couleur du ciel du moment, pour que le ciel monte
 * jusqu'en haut de l'écran. Notre balise theme-color est placée en tête (le navigateur prend la première) ;
 * elle suit aussi le passage du mode clair au mode sombre.
 */
function useBarreEtatDuCiel(ciel: RefObject<HTMLDivElement | null>, moment: MomentCiel) {
  useEffect(() => {
    const el = ciel.current;
    if (!el) return;
    const appliquer = () => {
      const couleur = getComputedStyle(el).getPropertyValue("--ciel").trim();
      if (!couleur) return;
      let balise = document.getElementById(ID_BARRE_ETAT) as HTMLMetaElement | null;
      if (!balise) {
        balise = document.createElement("meta");
        balise.id = ID_BARRE_ETAT;
        balise.name = "theme-color";
      }
      if (document.head.firstElementChild !== balise) document.head.prepend(balise);
      balise.content = couleur;
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
  }, [ciel, moment]);
}

/** Coupoles (deux plans), minaret et sa lanterne. */
function Silhouettes() {
  return (
    <>
      <g className="ciel-loin">
        <path d="M-10 138V108Q-10 96 10 90Q30 96 30 108V138Z M40 138V112Q40 104 52 100Q64 104 64 112V138Z M120 138V104Q120 92 140 86Q160 92 160 104V138Z M330 138V106Q330 96 346 90Q362 96 362 106V138Z" />
        <rect x="104" y="70" width="6" height="68" />
        <path d="M103 72H111L107 62Z" />
      </g>
      <g className="ciel-pres">
        <path d="M150 138V114Q150 104 162 100Q174 104 174 114V138Z" />
        <path d="M190 138V104Q190 84 224 72Q258 84 258 104V138Z" />
        <rect x="222" y="60" width="4" height="13" />
        <circle cx="224" cy="58" r="2.6" />
        <path d="M264 138V114Q264 106 276 102Q288 106 288 114V138Z" />
        <rect x="300" y="56" width="10" height="82" />
        <path d="M298 58H312L305 43Z" />
        <rect x="298" y="78" width="14" height="3" />
        <rect x="-20" y="128" width="400" height="10" />
      </g>
      <rect className="ciel-lanterne" x="303.5" y="64" width="3" height="6" rx="1.5" />
    </>
  );
}

/** Lune du mois hégirien : la part éclairée suit le jour du mois. */
function Lune({ jour }: { jour: number }) {
  const { eclairee, croissante } = phaseLune(jour);
  const r = 10;
  const decalage = 2 * r * eclairee * (croissante ? -1 : 1);
  return (
    <g className="ciel-lune">
      <defs>
        <mask id="masque-lune">
          <circle cx="246" cy="60" r={r} fill="#fff" />
          <circle cx={246 + decalage} cy="60" r={r + 0.4} fill="#000" />
        </mask>
      </defs>
      <circle cx="246" cy="60" r={r + 6} className="ciel-lune-halo" />
      <circle cx="246" cy="60" r={r} mask="url(#masque-lune)" className="ciel-lune-disque" />
    </g>
  );
}

/** Ramadan : deux lanternes suspendues qui se balancent. */
function Lanternes() {
  return (
    <g className="ciel-fanous">
      {[
        { x: 38, l: 22, d: "0s" },
        { x: 72, l: 12, d: "-1.4s" },
      ].map((f) => (
        <g
          key={f.x}
          className="ciel-fanous-un"
          style={{ transformOrigin: `${f.x}px 0px`, animationDelay: f.d }}
        >
          <line x1={f.x} y1="0" x2={f.x} y2={f.l} />
          <path
            d={`M${f.x - 5} ${f.l + 4}H${f.x + 5}L${f.x + 4} ${f.l + 16}H${f.x - 4}Z M${f.x - 3} ${f.l + 4}L${f.x} ${f.l}L${f.x + 3} ${f.l + 4}Z`}
          />
          <circle cx={f.x} cy={f.l + 10} r="2.2" className="ciel-fanous-flamme" />
        </g>
      ))}
    </g>
  );
}

/**
 * Décor vivant de la barre du haut : le ciel suit les vraies heures de prière de la mosquée
 * (aube, jour, coucher, nuit), la lune suit le mois hégirien, les jours particuliers s'y voient
 * (vendredi, jours blancs, Ramadan, Aïd). Tout bouge lentement ; rien si le téléphone demande
 * moins d'animations. Purement décoratif (masqué aux lecteurs d'écran).
 */
export function CielDecor({ horaires, jourHegire, particulier, maintenant }: CielProps) {
  const { minutes, fixe } = useMinutes(maintenant);
  const ciel = useRef<HTMLDivElement>(null);
  const moment = fixe ?? momentDuCiel(minutes, horaires);
  const fete = fixe ? null : particulier;
  const bas = moment === "fajr" || moment === "maghrib";
  useBarreEtatDuCiel(ciel, moment);
  return (
    <div
      ref={ciel}
      className="ciel"
      data-moment={moment}
      data-particulier={fete ?? undefined}
      aria-hidden="true"
    >
      <div className="ciel-motif" />
      <svg className="ciel-scene" viewBox="0 0 360 138">
        <defs>
          <radialGradient id="ciel-halo-degrade" className="ciel-halo-degrade">
            <stop offset="0" stopColor="currentColor" stopOpacity="1" />
            <stop offset="0.45" stopColor="currentColor" stopOpacity="0.45" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          className="ciel-halo"
          cx={bas ? 224 : 246}
          cy={bas ? 84 : 60}
          r="80"
          fill="url(#ciel-halo-degrade)"
        />
        {moment === "jour" ? <circle className="ciel-soleil" cx="246" cy="60" r="10" /> : null}
        {bas ? <circle className="ciel-soleil-bas" cx="224" cy="84" r="13" /> : null}
        {!fixe && jourHegire !== null && moment !== "jour" ? <Lune jour={jourHegire} /> : null}
        <g className="ciel-nuages">
          <ellipse cx="40" cy="30" rx="26" ry="7" />
          <ellipse cx="20" cy="54" rx="18" ry="5" />
        </g>
        <g className="ciel-etoiles">
          {[
            [40, 22, 1],
            [120, 12, 1.2],
            [175, 30, 0.9],
            [215, 14, 1.1],
            [340, 66, 1],
            [80, 46, 0.8],
            [250, 52, 0.9],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: `${(i * 0.7) % 3}s` }} />
          ))}
          <line className="ciel-filante" x1="60" y1="10" x2="150" y2="40" />
        </g>
        {fete === "ramadan" ? <Lanternes /> : null}
        <Silhouettes />
      </svg>
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
}: CielProps & { dateFrancaise: string; dateHegirienneArabe: string | null }) {
  const { minutes, fixe } = useMinutes(maintenant);
  const fete = fixe ? null : particulier;
  return (
    <p className="barre-dates">
      <span className="barre-dates-fr">
        {dateFrancaise}{" "}
        <span className="barre-dates-temps" lang="ar" dir="rtl">
          {fete ? LIBELLE_JOUR_PARTICULIER[fete] : tempsDePriere(minutes, horaires)}
        </span>
      </span>
      {dateHegirienneArabe ? (
        <span className="barre-dates-hegire" lang="ar" dir="rtl">
          {dateHegirienneArabe}
        </span>
      ) : null}
    </p>
  );
}

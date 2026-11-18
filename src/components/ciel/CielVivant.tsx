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
      const style = getComputedStyle(el);
      // Barre d'état : le haut du ciel ; fondu sous la barre : l'horizon.
      const couleur = (style.getPropertyValue("--ciel-haut") || style.getPropertyValue("--ciel")).trim();
      // Le fondu part de la couleur exacte du sol (coupoles du premier plan) : aucune marche visible.
      const sol = el.querySelector(".ciel-pres");
      const horizon = (sol ? getComputedStyle(sol).fill : "") || style.getPropertyValue("--ciel").trim();
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
      {/* Seul le haut de la grande coupole et du minaret est bordé d'or. */}
      <path className="ciel-lisere" d="M192 98Q194 84 224 72Q254 84 256 98 M298 58L305 43L312 58" />
      <rect className="ciel-lanterne" x="303.5" y="64" width="3" height="6" rx="1.5" />
      {/* Fenêtres allumées : la ville vit la nuit. */}
      <g className="ciel-fenetres">
        <path d="M209 104V96Q209 92 212 91Q215 92 215 96V104Z" />
        <path d="M221 104V94Q221 90 224 89Q227 90 227 94V104Z" />
        <path d="M233 104V96Q233 92 236 91Q239 92 239 96V104Z" />
        <rect x="303.5" y="86" width="3" height="7" rx="1.5" />
        <rect x="106" y="90" width="2" height="6" rx="1" />
      </g>
    </>
  );
}

/** Lune du mois hégirien : la part éclairée suit le jour du mois. */
function Lune({
  jour,
  cx = 262,
  cy = 60,
  r = 10,
  id = "masque-lune",
}: {
  jour: number;
  cx?: number;
  cy?: number;
  r?: number;
  id?: string;
}) {
  const { eclairee, croissante } = phaseLune(jour);
  const decalage = 2 * r * eclairee * (croissante ? -1 : 1);
  const k = r / 10;
  return (
    <g className="ciel-lune">
      <defs>
        <mask id={id}>
          <circle cx={cx} cy={cy} r={r} fill="#fff" />
          <circle cx={cx + decalage} cy={cy} r={r + 0.4 * k} fill="#000" />
        </mask>
      </defs>
      {/* Lueur : intense contre la lune, elle se dissipe en s'éloignant. */}
      <circle cx={cx} cy={cy} r={r * 3.4} className="ciel-lune-halo" fill="url(#lune-lueur)" />
      <g mask={`url(#${id})`}>
        <circle cx={cx} cy={cy} r={r} className="ciel-lune-disque" />
        {/* Quelques « mers » sombres : la lune ressemble à la lune. */}
        <g className="ciel-lune-mers">
          <circle cx={cx - 3 * k} cy={cy - 3.5 * k} r={2.6 * k} />
          <circle cx={cx + 3.5 * k} cy={cy - 2 * k} r={1.8 * k} />
          <circle cx={cx - 1 * k} cy={cy + 3.5 * k} r={2.1 * k} />
          <circle cx={cx + 4 * k} cy={cy + 4 * k} r={1.1 * k} />
        </g>
      </g>
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
          cx={bas ? 224 : 262}
          cy={bas ? 84 : 60}
          r="80"
          fill="url(#ciel-halo-degrade)"
        />
        <defs>
          {/* Soleil du jour : une lueur chaude et un disque clair au cœur. */}
          <radialGradient id="soleil-lueur">
            <stop offset="0.18" stopColor="#fff4c8" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#ffe08a" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#ffd56e" stopOpacity="0.2" />
            <stop offset="0.75" stopColor="#ffb84d" stopOpacity="0.06" />
            <stop offset="1" stopColor="#ffb84d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="soleil-disque" cx="0.5" cy="0.5">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#fff6c8" />
            <stop offset="0.8" stopColor="#ffd75a" />
            <stop offset="1" stopColor="#ffb82e" />
          </radialGradient>
          {/* Couronne du soleil : une lumière chaude collée au disque. */}
          <radialGradient id="soleil-couronne">
            <stop offset="0.55" stopColor="#fff2b0" stopOpacity="0.9" />
            <stop offset="0.75" stopColor="#ffd56a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffb84d" stopOpacity="0" />
          </radialGradient>
          {/* Soleil bas (aube, Maghrib) : plus grand, orangé. */}
          <radialGradient id="soleil-bas-lueur">
            <stop offset="0.25" stopColor="#ffd9a8" stopOpacity="0.9" />
            <stop offset="0.4" stopColor="#ff9a55" stopOpacity="0.45" />
            <stop offset="0.65" stopColor="#ff8a45" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ff7a3a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="soleil-bas-disque" cx="0.5" cy="0.5">
            <stop offset="0" stopColor="#fff6e6" />
            <stop offset="0.45" stopColor="#ffc982" />
            <stop offset="0.8" stopColor="#ff8f4a" />
            <stop offset="1" stopColor="#e9612c" />
          </radialGradient>
          {/* Lune : disque modelé (éclairé en haut à gauche) et lueur argentée. */}
          <radialGradient id="lune-modele" cx="0.38" cy="0.35">
            <stop offset="0" stopColor="#fdfcf7" />
            <stop offset="0.6" stopColor="#e8e5da" />
            <stop offset="1" stopColor="#bcb7a8" />
          </radialGradient>
          <radialGradient id="lune-lueur">
            <stop offset="0.3" stopColor="#f1f4fa" stopOpacity="0.42" />
            <stop offset="0.45" stopColor="#e3e9f2" stopOpacity="0.16" />
            <stop offset="0.7" stopColor="#dfe6f0" stopOpacity="0.04" />
            <stop offset="1" stopColor="#dfe6f0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {moment === "jour" ? (
          <g className="ciel-soleil-reel">
            <circle cx="262" cy="60" r="38" fill="url(#soleil-lueur)" />
            <circle cx="262" cy="60" r="17" fill="url(#soleil-couronne)" />
            <circle cx="262" cy="60" r="10" fill="url(#soleil-disque)" />
          </g>
        ) : null}
        {bas ? (
          <g className="ciel-soleil-reel">
            <circle cx="224" cy="84" r="36" fill="url(#soleil-bas-lueur)" />
            <circle cx="224" cy="84" r="13" fill="url(#soleil-bas-disque)" />
          </g>
        ) : null}
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
            [196, 50, 1],
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

/**
 * Ciel en miniature pour l'en-tête compact (quand on descend dans la page) : même moment, mêmes couleurs,
 * le même astre (lune du mois ou soleil) et les coupoles en petit, calées à droite.
 * Les dégradés du soleil et de la lune viennent du grand ciel, toujours présent dans la barre.
 */
export function CielMini({ horaires, jourHegire, maintenant }: CielProps) {
  const { minutes, fixe } = useMinutes(maintenant);
  const moment = fixe ?? momentDuCiel(minutes, horaires);
  const bas = moment === "fajr" || moment === "maghrib";
  return (
    <div className="ciel ciel-mini" data-moment={moment} aria-hidden="true">
      <div className="ciel-motif" />
      <svg className="ciel-mini-scene" viewBox="0 0 220 64" preserveAspectRatio="xMaxYMax meet">
        <g className="ciel-etoiles">
          {[
            [24, 14, 0.9],
            [70, 30, 0.8],
            [118, 10, 1],
            [150, 40, 0.7],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: `${(i * 0.9) % 3}s` }} />
          ))}
        </g>
        {moment === "jour" ? (
          <g className="ciel-soleil-reel">
            <circle cx="96" cy="26" r="22" fill="url(#soleil-lueur)" />
            <circle cx="96" cy="26" r="12" fill="url(#soleil-couronne)" />
            <circle cx="96" cy="26" r="7" fill="url(#soleil-disque)" />
          </g>
        ) : null}
        {bas ? (
          <g className="ciel-soleil-reel">
            <circle cx="90" cy="46" r="26" fill="url(#soleil-bas-lueur)" />
            <circle cx="90" cy="46" r="8.5" fill="url(#soleil-bas-disque)" />
          </g>
        ) : null}
        {!fixe && jourHegire !== null && moment !== "jour" ? (
          <Lune jour={jourHegire} cx={96} cy={24} r={7} id="masque-lune-mini" />
        ) : null}
        {/* Les coupoles et le minaret, en petit (même dessin que la grande barre). */}
        <g transform="translate(220 64) scale(0.4) translate(-360 -138)">
          <Silhouettes />
        </g>
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

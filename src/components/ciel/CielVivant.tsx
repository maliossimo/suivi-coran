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
      {/* Au loin : petites coupoles et une tour, plus pâles. */}
      <g className="ciel-loin">
        <path d="M-10 138V108Q-10 96 10 90Q30 96 30 108V138Z M40 138V112Q40 104 52 100Q64 104 64 112V138Z M100 138V110Q100 100 114 95Q128 100 128 110V138Z M330 138V106Q330 96 346 90Q362 96 362 106V138Z" />
        <rect x="84" y="74" width="5" height="64" />
        <path d="M83 76H90L86.5 64Z" />
      </g>
      {/* La mosquée : grande coupole en bulbe sur son tambour, deux petites coupoles, deux minarets.
          Réduite depuis sa base pour tenir entière au-dessus de la ligne des dates. */}
      <g transform="translate(224 104) scale(0.78) translate(-224 -104)">
        <g className="ciel-pres">
          {/* minaret gauche */}
          <rect x="146" y="40" width="6" height="98" />
          <rect x="144" y="62" width="10" height="2.6" rx="1" />
          <rect x="144" y="84" width="10" height="2.6" rx="1" />
          <path d="M145 41H153L149 26Z" />
          <rect x="148.4" y="20" width="1.2" height="6" />
          {/* petite coupole gauche */}
          <rect x="168" y="96" width="24" height="42" />
          <path d="M168 96C168 86 175 81 180 78Q180 75 180 72Q180 75 180 78C185 81 192 86 192 96Z" />
          {/* grande coupole */}
          <rect x="196" y="92" width="56" height="46" />
          <path d="M193 93H255V96H193Z" />
          <path d="M196 92C195 76 207 66 217 60Q223 56 224 48Q225 56 231 60C241 66 253 76 252 92Z" />
          <rect x="223.3" y="36" width="1.4" height="12" />
          {/* petite coupole droite */}
          <rect x="256" y="96" width="24" height="42" />
          <path d="M256 96C256 86 263 81 268 78Q268 75 268 72Q268 75 268 78C273 81 280 86 280 96Z" />
          {/* minaret droit */}
          <rect x="300" y="40" width="7" height="98" />
          <rect x="298" y="60" width="11" height="2.8" rx="1" />
          <rect x="298" y="82" width="11" height="2.8" rx="1" />
          <path d="M299 41H308L303.5 24Z" />
          <rect x="302.9" y="18" width="1.2" height="6" />
        </g>
        {/* Croissant au sommet de la grande coupole. */}
        <path className="ciel-croissant" d="M224 26.5a4.2 4.2 0 1 0 3 7.2 3.3 3.3 0 1 1 -3-7.2z" />
        <rect className="ciel-lanterne" x="301.9" y="66" width="3" height="6" rx="1.5" />
        {/* Fenêtres en arc : lumière chaude la nuit, le ciel au travers le jour. */}
        <g className="ciel-fenetres">
          <path d="M201 104V97Q201 94.5 203 94Q205 94.5 205 97V104Z" />
          <path d="M210 104V97Q210 94.5 212 94Q214 94.5 214 97V104Z" />
          <path d="M219 104V97Q219 94.5 221 94Q223 94.5 223 97V104Z" />
          <path d="M225 104V97Q225 94.5 227 94Q229 94.5 229 97V104Z" />
          <path d="M234 104V97Q234 94.5 236 94Q238 94.5 238 97V104Z" />
          <path d="M243 104V97Q243 94.5 245 94Q247 94.5 247 97V104Z" />
          <path d="M175 106V100Q175 98 177 97.6Q179 98 179 100V106Z" />
          <path d="M181 106V100Q181 98 183 97.6Q185 98 185 100V106Z" />
          <path d="M263 106V100Q263 98 265 97.6Q267 98 267 100V106Z" />
          <path d="M269 106V100Q269 98 271 97.6Q273 98 273 100V106Z" />
          <rect x="148" y="48" width="2" height="6" rx="1" />
          <rect x="148" y="70" width="2" height="6" rx="1" />
          <rect x="302.5" y="46" width="2" height="6" rx="1" />
          <rect x="302.5" y="88" width="2" height="6" rx="1" />
        </g>
      </g>
      <rect className="ciel-sol" x="-20" y="128" width="400" height="10" />
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

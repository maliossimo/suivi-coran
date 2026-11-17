/**
 * Heures de prière calculées pour un lieu et un jour (heure de Paris, en minutes depuis minuit).
 * Méthode astronomique classique (position du Soleil) ; Fajr et Icha à 12° sous l'horizon,
 * l'angle utilisé par la plupart des mosquées de France ; Asr selon l'ombre égale à l'objet.
 * L'été, si le Soleil ne descend pas assez, Fajr et Icha suivent une part de la nuit.
 * Sert à donner son ciel à la barre du haut : quelques minutes d'écart avec le calendrier
 * de la mosquée n'ont pas d'importance ici.
 */
import type { DateISO } from "./calendrier";

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

/** Paris : repli quand la mosquée n'a pas encore de position. */
export const COORDONNEES_PAR_DEFAUT: Coordonnees = { latitude: 48.8566, longitude: 2.3522 };

export interface HorairesPriere {
  fajr: number;
  lever: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

const ANGLE_FAJR = 12;
const ANGLE_ISHA = 12;

const rad = (x: number) => (x * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;
const fixe = (a: number, b: number) => ((a % b) + b) % b;

function soleil(jd: number): { declinaison: number; equation: number } {
  const d = jd - 2451545.0;
  const g = fixe(357.529 + 0.98560028 * d, 360);
  const q = fixe(280.459 + 0.98564736 * d, 360);
  const l = fixe(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * d;
  const ra = fixe(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(l)), Math.cos(rad(l)))) / 15, 24);
  return {
    declinaison: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(l)))),
    equation: q / 15 - ra,
  };
}

/** Décalage de Paris (en heures) avec l'heure universelle, ce jour-là. */
function decalageParis(annee: number, mois: number, jour: number): number {
  const midi = new Date(Date.UTC(annee, mois - 1, jour, 12));
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).format(
      midi,
    ),
  );
  return h - 12;
}

export function horairesPriere(date: DateISO, lieu: Coordonnees = COORDONNEES_PAR_DEFAUT): HorairesPriere {
  const [annee, mois, jour] = date.split("-").map(Number) as [number, number, number];
  const jd = Date.UTC(annee, mois - 1, jour, 12) / 86400000 + 2440587.5 - lieu.longitude / 360;
  const { declinaison, equation } = soleil(jd);
  const lat = rad(lieu.latitude);
  const dec = rad(declinaison);
  // Heure (solaire) à laquelle le Soleil est à `angle` degrés sous l'horizon, de part et d'autre de midi.
  const ecart = (angle: number) =>
    deg(
      Math.acos((-Math.sin(rad(angle)) - Math.sin(dec) * Math.sin(lat)) / (Math.cos(dec) * Math.cos(lat))),
    ) / 15;
  const midi = 12 - equation;
  const lever = midi - ecart(0.833);
  const coucher = midi + ecart(0.833);
  const nuit = 24 - (coucher - lever);
  const angleAsr = -deg(Math.atan(1 / (1 + Math.tan(Math.abs(lat - dec)))));
  const fajrBrut = midi - ecart(ANGLE_FAJR);
  const ishaBrut = midi + ecart(ANGLE_ISHA);
  const fajr = Number.isFinite(fajrBrut) ? fajrBrut : lever - (nuit * ANGLE_FAJR) / 60;
  const isha = Number.isFinite(ishaBrut) ? ishaBrut : coucher + (nuit * ANGLE_ISHA) / 60;
  const versParis = (h: number) =>
    Math.round(fixe((h - lieu.longitude / 15 + decalageParis(annee, mois, jour)) * 60, 1440));
  return {
    fajr: versParis(fajr),
    lever: versParis(lever),
    dhuhr: versParis(midi),
    asr: versParis(midi + ecart(angleAsr)),
    maghrib: versParis(coucher),
    isha: versParis(isha),
  };
}

/** « 05:47 » */
export function formaterMinutes(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Minutes depuis minuit à Paris pour un instant donné. */
export function minutesParis(instant: Date): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  })
    .format(instant)
    .split(":")
    .map(Number) as [number, number];
  return h * 60 + m;
}

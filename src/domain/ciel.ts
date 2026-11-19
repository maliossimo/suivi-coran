/**
 * Le ciel de la barre du haut : moment de la journée (d'après les heures de prière), lune du mois
 * hégirien, jours particuliers du calendrier musulman, et titres des pages en arabe.
 */
import type { DateISO } from "./calendrier";
import type { DateHegirienne } from "./hegire";
import type { HorairesPriere } from "./priere";

export type MomentCiel = "fajr" | "jour" | "maghrib" | "nuit";

/** Aube (Fajr → un peu après le lever), jour, coucher (un peu avant le Maghrib → Icha), nuit. */
export function momentDuCiel(minutes: number, h: HorairesPriere): MomentCiel {
  if (minutes >= h.fajr && minutes < h.lever + 15) return "fajr";
  if (minutes >= h.lever + 15 && minutes < h.maghrib - 25) return "jour";
  if (minutes >= h.maghrib - 25 && minutes < h.isha) return "maghrib";
  return "nuit";
}

/** La nuit en deux temps : la nuit profonde (après l'Icha), puis le dernier tiers de la nuit (tahajjud). */
export type PhaseNuit = "profonde" | "tahajjud";

/**
 * Début du dernier tiers de la nuit, en minutes depuis minuit ; la nuit va du Maghrib au Fajr du
 * lendemain, donc la valeur peut dépasser 1440 (ex. 1548 pour 01 h 48 du matin).
 */
export function debutDernierTiers(h: HorairesPriere): number {
  return h.maghrib + (2 * (h.fajr + 1440 - h.maghrib)) / 3;
}

/** La phase de la nuit (profonde ou dernier tiers), ou null quand ce n'est pas la nuit. */
export function phaseDeNuit(minutes: number, h: HorairesPriere): PhaseNuit | null {
  if (momentDuCiel(minutes, h) !== "nuit") return null;
  const t = minutes < h.fajr ? minutes + 1440 : minutes;
  return t >= debutDernierTiers(h) ? "tahajjud" : "profonde";
}

/** Où est l'astre dans le ciel ? Le soleil entre le lever et le Maghrib, la lune le reste du temps. */
export interface PositionAstre {
  astre: "soleil" | "lune";
  /** Avancée de la gauche (0) vers la droite (1) ; un peu en dehors de 0..1, l'astre est sous l'horizon. */
  avance: number;
  /** Hauteur dans le ciel : 0 à l'horizon, 1 au zénith ; négative sous l'horizon. */
  hauteur: number;
  /** 0 (haut dans le ciel) à 1 (sur l'horizon) : l'astre est plus gros et plus chaud près de l'horizon. */
  bas: number;
}

function astreA(astre: "soleil" | "lune", avance: number): PositionAstre {
  const hauteur = Math.sin(Math.PI * avance);
  const bas = Math.min(1, Math.max(0, 1 - hauteur / 0.35));
  return { astre, avance, hauteur: Math.round(hauteur * 1000) / 1000, bas: Math.round(bas * 1000) / 1000 };
}

/**
 * Le soleil se lève au Chourouq, passe au plus haut à midi et se couche au Maghrib ; la lune
 * prend le relais et traverse le ciel jusqu'au lever du soleil suivant.
 */
export function positionAstre(minutes: number, h: HorairesPriere): PositionAstre {
  if (minutes >= h.lever - 20 && minutes <= h.maghrib + 20) {
    return astreA("soleil", (minutes - h.lever) / (h.maghrib - h.lever));
  }
  const debut = h.maghrib + 15;
  const fin = h.lever - 15 + 1440;
  const t = minutes < h.lever - 20 ? minutes + 1440 : minutes;
  return astreA("lune", (t - debut) / (fin - debut));
}

/** Tests visuels (ciel figé) : le moment demandé, avec la phase de nuit voulue. */
export type CielFige = MomentCiel | "nuit-profonde" | "tahajjud";

/** Position de l'astre d'un ciel figé (indépendante de la date : captures identiques tous les jours). */
export function positionAstreFigee(fige: CielFige): PositionAstre | null {
  if (fige === "fajr") return astreA("soleil", 0.02);
  if (fige === "jour") return astreA("soleil", 0.55);
  if (fige === "maghrib") return astreA("soleil", 0.98);
  return null;
}

/** Temps de prière en cours, en arabe : « وقت الفجر », « وقت الضحى »… */
export function tempsDePriere(minutes: number, h: HorairesPriere): string {
  if (minutes >= h.fajr && minutes < h.lever) return "وقت الفجر";
  if (minutes >= h.lever && minutes < h.dhuhr) return "وقت الضحى";
  if (minutes >= h.dhuhr && minutes < h.asr) return "وقت الظهر";
  if (minutes >= h.asr && minutes < h.maghrib) return "وقت العصر";
  if (minutes >= h.maghrib && minutes < h.isha) return "وقت المغرب";
  return "وقت العشاء";
}

/**
 * Lune du jour hégirien (le mois commence au premier croissant) : part éclairée (0 à 1) et sens
 * (croissante jusqu'à la pleine lune du 14-15, puis décroissante).
 */
export function phaseLune(jourHegire: number): { eclairee: number; croissante: boolean } {
  const age = Math.min(29.5, Math.max(0, jourHegire + 0.5));
  const eclairee = (1 - Math.cos((2 * Math.PI * age) / 29.53)) / 2;
  return { eclairee: Math.round(eclairee * 1000) / 1000, croissante: age < 14.77 };
}

export type JourParticulier = "aid-fitr" | "aid-adha" | "ramadan" | "jours-blancs" | "vendredi";

/** Le jour particulier le plus important (les fêtes d'abord), ou null. */
export function jourParticulier(date: DateISO, h: DateHegirienne | null): JourParticulier | null {
  if (h) {
    if (h.mois === 10 && h.jour <= 3) return "aid-fitr";
    if (h.mois === 12 && h.jour >= 10 && h.jour <= 13) return "aid-adha";
    if (h.mois === 9) return "ramadan";
  }
  if (new Date(`${date}T12:00:00Z`).getUTCDay() === 5) return "vendredi";
  if (h && h.jour >= 13 && h.jour <= 15) return "jours-blancs";
  return null;
}

export const LIBELLE_JOUR_PARTICULIER: Record<JourParticulier, string> = {
  "aid-fitr": "عيد الفطر مبارك",
  "aid-adha": "عيد الأضحى مبارك",
  ramadan: "رمضان مبارك",
  "jours-blancs": "الأيام البيض",
  vendredi: "جمعة مباركة",
};

/** Titres des pages et onglets en arabe (calligraphiés dans la barre). */
const TITRES_ARABES: Record<string, string> = {
  "Ma fiche": "سجلّي",
  Coran: "القرآن الكريم",
  "Ma progression": "تقدّمي",
  Progression: "تقدّمي",
  "Mon compte": "حسابي",
  Compte: "حسابي",
  "Ma classe": "حلقتي",
  Élèves: "الطلاب",
  Inviter: "دعوة",
  Administration: "الإدارة",
  Admin: "الإدارة",
  Présences: "الحضور",
  Appel: "تسجيل الحضور",
  "Ma mosquée": "مسجدي",
  Mosquée: "المسجد",
  "Ma lecture": "قراءتي",
  Journal: "السجلّ",
  Nouveautés: "الجديد",
  Enchaînements: "وصل الآيات",
  "Ce que je connais": "محفوظاتي",
  "Fiche de l'élève": "سجلّ الطالب",
  Plus: "المزيد",
};

/** Titre arabe d'une page, ou null (ex. le nom d'un élève). */
export function titreArabe(titre: string): string | null {
  return TITRES_ARABES[titre] ?? null;
}

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

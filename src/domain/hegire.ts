/**
 * Date hégirienne (calendrier Umm al-Qura, celui de La Mecque) d'un jour du calendrier grégorien.
 * Les noms des mois sont les nôtres (phonétique française et arabe), pas ceux du navigateur.
 */
import type { DateISO } from "./calendrier";

export const MOIS_HEGIRIENS = [
  { fr: "Mouharram", ar: "محرم" },
  { fr: "Safar", ar: "صفر" },
  { fr: "Rabi‘ al-awwal", ar: "ربيع الأول" },
  { fr: "Rabi‘ ath-thani", ar: "ربيع الآخر" },
  { fr: "Joumada al-oula", ar: "جمادى الأولى" },
  { fr: "Joumada ath-thania", ar: "جمادى الآخرة" },
  { fr: "Rajab", ar: "رجب" },
  { fr: "Cha‘bane", ar: "شعبان" },
  { fr: "Ramadan", ar: "رمضان" },
  { fr: "Chawwal", ar: "شوال" },
  { fr: "Dhou al-qi‘da", ar: "ذو القعدة" },
  { fr: "Dhou al-hijja", ar: "ذو الحجة" },
] as const;

export interface DateHegirienne {
  jour: number;
  /** 1 = Mouharram … 12 = Dhou al-hijja */
  mois: number;
  annee: number;
}

const FORMAT = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** null si le moteur ne connaît pas ce calendrier (on n'affiche alors rien). */
export function dateHegirienne(date: DateISO): DateHegirienne | null {
  try {
    const parts = FORMAT.formatToParts(new Date(`${date}T12:00:00Z`));
    const val = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const res = { jour: val("day"), mois: val("month"), annee: val("year") };
    if (![res.jour, res.mois, res.annee].every(Number.isInteger) || res.mois < 1 || res.mois > 12)
      return null;
    return res;
  } catch {
    return null;
  }
}

/** « 7 Joumada ath-thania 1448 » */
export function libelleHegirien(d: DateHegirienne): string {
  return `${d.jour} ${MOIS_HEGIRIENS[d.mois - 1]!.fr} ${d.annee}`;
}

/** « ٧ جمادى الآخرة ١٤٤٨ هـ » (chiffres arabes) */
export function libelleHegirienArabe(d: DateHegirienne): string {
  const ar = (n: number) => n.toLocaleString("ar-EG", { useGrouping: false });
  return `${ar(d.jour)} ${MOIS_HEGIRIENS[d.mois - 1]!.ar} ${ar(d.annee)} هـ`;
}

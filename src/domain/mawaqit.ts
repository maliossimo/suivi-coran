/**
 * Lecture des horaires publiés par une mosquée sur sa page Mawaqit (https://mawaqit.net/fr/m/<adresse>).
 * La page publique contient un objet JSON `var confData = {…};` : calendrier de l'année (12 mois,
 * pour chaque jour [Fajr, Chourouq, Dhuhr, Asr, Maghrib, Icha]), calendrier d'iqama (décalage
 * « +10 » ou heure fixe « 13:45 » par prière), heures de Joumou'a et fuseau horaire.
 * Règles pures : aucune requête ici (voir services/mawaqit).
 */

/** Adresse Mawaqit d'une mosquée (fin de l'URL de sa page), ex. « mosquee-de-lieusaint ». */
export const MOTIF_ADRESSE_MAWAQIT = /^[a-z0-9-]{1,160}$/;

export function urlPageMawaqit(adresse: string): string {
  if (!MOTIF_ADRESSE_MAWAQIT.test(adresse)) throw new Error("Adresse Mawaqit invalide");
  return `https://mawaqit.net/fr/m/${adresse}`;
}

/**
 * Extrait l'objet `confData` du HTML de la page (JSON brut, à valider ensuite) ;
 * null s'il est absent ou illisible. Parcourt les accolades en tenant compte des chaînes.
 */
export function extraireConfData(html: string): unknown {
  const marque = /var\s+confData\s*=\s*\{/.exec(html);
  if (!marque) return null;
  const debut = marque.index + marque[0].length - 1;
  let profondeur = 0;
  let dansChaine = false;
  for (let i = debut; i < html.length; i++) {
    const c = html[i];
    if (dansChaine) {
      if (c === "\\") i++;
      else if (c === '"') dansChaine = false;
      continue;
    }
    if (c === '"') dansChaine = true;
    else if (c === "{") profondeur++;
    else if (c === "}") {
      profondeur--;
      if (profondeur === 0) {
        try {
          return JSON.parse(html.slice(debut, i + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** « 06:29 » → 389 (minutes depuis minuit) ; null si illisible. */
export function heureEnMinutes(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Iqama d'une prière : « +10 » = 10 min après l'adhan, « 13:45 » = heure fixe.
 * null si absente, illisible, avant l'adhan ou après minuit.
 */
export function iqamaEnMinutes(valeur: string | null | undefined, adhan: number): number | null {
  const v = String(valeur ?? "").trim();
  const decalage = /^\+?(\d{1,3})$/.exec(v);
  const heure = decalage ? adhan + Number(decalage[1]) : heureEnMinutes(v);
  if (heure === null || heure < adhan || heure > 1439) return null;
  return heure;
}

/** Ce que l'on retient de confData (après validation de forme côté serveur). */
export interface ConfMawaqit {
  calendar: Record<string, string[]>[];
  iqamaCalendar?: Record<string, string[]>[] | null;
  jumua?: string | null;
  jumua2?: string | null;
  jumua3?: string | null;
  timezone?: string | null;
}

/** Un jour du calendrier, en minutes depuis minuit (heure locale de la mosquée). */
export interface JourHoraires {
  mois: number;
  jour: number;
  fajr: number;
  chourouq: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  iqamaFajr: number | null;
  iqamaDhuhr: number | null;
  iqamaAsr: number | null;
  iqamaMaghrib: number | null;
  iqamaIsha: number | null;
}

export interface HorairesMawaqit {
  jours: JourHoraires[];
  /** Heures de Joumou'a (1 à 3), en minutes. */
  jumua: number[];
}

/** Seul fuseau géré par l'appli (le ciel et les dates sont à l'heure de Paris). */
export const FUSEAU_GERE = "Europe/Paris";

const JOURS_PAR_MOIS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Transforme confData en calendrier vérifié : 12 mois complets, prières dans l'ordre.
 * Lève une erreur explicite sinon (rien n'est alors enregistré).
 */
export function horairesDepuisConf(conf: ConfMawaqit): HorairesMawaqit {
  if (conf.timezone && conf.timezone !== FUSEAU_GERE)
    throw new Error(`Fuseau horaire non géré : ${conf.timezone}`);
  if (conf.calendar.length !== 12) throw new Error("Calendrier incomplet : 12 mois attendus");

  const jours: JourHoraires[] = [];
  conf.calendar.forEach((joursDuMois, i) => {
    const mois = i + 1;
    const maxi = JOURS_PAR_MOIS[i]!;
    // Février a 28 jours certaines années : le 29 est facultatif.
    const mini = mois === 2 ? 28 : maxi;
    const cles = Object.keys(joursDuMois);
    if (cles.length < mini || cles.length > maxi)
      throw new Error(`Mois ${mois} : ${cles.length} jours au lieu de ${maxi}`);
    const iqamas = conf.iqamaCalendar?.[i] ?? {};

    for (const cle of cles) {
      const jour = Number(cle);
      if (!Number.isInteger(jour) || jour < 1 || jour > maxi)
        throw new Error(`Mois ${mois} : jour « ${cle} » invalide`);
      const heures = (joursDuMois[cle] ?? []).slice(0, 6).map(heureEnMinutes);
      if (heures.length < 6 || heures.some((h) => h === null))
        throw new Error(`${jour}/${mois} : heure illisible`);
      const [fajr, chourouq, dhuhr, asr, maghrib, isha] = heures as number[] as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      if (!(fajr < chourouq && chourouq < dhuhr && dhuhr < asr && asr < maghrib && maghrib < isha))
        throw new Error(`${jour}/${mois} : prières dans le désordre`);
      const iq = iqamas[cle] ?? [];
      jours.push({
        mois,
        jour,
        fajr,
        chourouq,
        dhuhr,
        asr,
        maghrib,
        isha,
        iqamaFajr: iqamaEnMinutes(iq[0], fajr),
        iqamaDhuhr: iqamaEnMinutes(iq[1], dhuhr),
        iqamaAsr: iqamaEnMinutes(iq[2], asr),
        iqamaMaghrib: iqamaEnMinutes(iq[3], maghrib),
        iqamaIsha: iqamaEnMinutes(iq[4], isha),
      });
    }
  });

  const jumua = [conf.jumua, conf.jumua2, conf.jumua3]
    .map(heureEnMinutes)
    .filter((m): m is number => m !== null);
  return { jours, jumua: [...new Set(jumua)].sort((a, b) => a - b) };
}

/** Faut-il relire la page ? Une fois par mois suffit (les horaires changent rarement). */
export const JOURS_ENTRE_DEUX_IMPORTS = 25;

/** Après un échec, on retente le lendemain, pas avant. */
export const HEURES_ENTRE_DEUX_ESSAIS = 20;

export function importADesuet(
  dernierImport: Date | null,
  maintenant: Date,
  dernierEssai: Date | null = null,
): boolean {
  if (dernierEssai && maintenant.getTime() - dernierEssai.getTime() < HEURES_ENTRE_DEUX_ESSAIS * 3_600_000)
    return false;
  if (!dernierImport) return true;
  return maintenant.getTime() - dernierImport.getTime() >= JOURS_ENTRE_DEUX_IMPORTS * 86_400_000;
}

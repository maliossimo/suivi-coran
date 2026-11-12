/**
 * Indicateurs de progression d'un élève, calculés à partir de ses séances.
 * Code pur : les graphiques ne font qu'afficher ces résultats.
 */
import { formaterDate, lireDate, type DateISO } from "./calendrier";
import { joursEntre } from "./classe";
import type { Objectif, Seance } from "./fiche";
import {
  fusionner,
  pourcentageDuCoran,
  versIntervalle,
  type Intervalle,
  type Referentiel,
  type Sourate,
} from "./versets";

export interface PointMois {
  cle: string; // AAAA-MM
  libelle: string; // « nov. »
  valeur: number;
}

export interface BarreSemaine {
  debut: DateISO;
  libelle: string; // « 3 nov. »
  apprentissage: number;
  revision: number;
}

export interface CaseRegularite {
  date: DateISO;
  minutes: number;
  niveau: 0 | 1 | 2 | 3;
  futur: boolean;
}

export interface ProgressionSourate {
  sourate: Sourate;
  versetsAppris: number;
  /** Parmi les versets appris, ceux que le Cheikh a vus. */
  versetsVus: number;
  pourcentage: number;
  derniereRevision: DateISO | null;
}

export interface Progression {
  versetsAppris: number;
  /** Versets appris que le Cheikh a vus (passages corrigés) : le reste est seulement déclaré. */
  versetsVus: number;
  pourcentageCoran: number;
  souratesCompletes: number;
  cumulParMois: PointMois[];
  minutesParSemaine: BarreSemaine[];
  regularite: CaseRegularite[][]; // colonnes = semaines (lundi → dimanche)
  objectifsParMois: { cle: string; libelle: string; atteints: number; total: number }[];
  sourates: ProgressionSourate[];
  joursConsecutifs: number;
}

const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function ajouterJours(date: DateISO, n: number): DateISO {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function libelleCourt(date: DateISO): string {
  const { mois, jour } = lireDate(date);
  return `${jour} ${MOIS_COURTS[mois - 1]}`;
}

function moisPrecedents(
  aujourdhui: DateISO,
  nombre: number,
): { cle: string; libelle: string; fin: DateISO }[] {
  const { annee, mois } = lireDate(aujourdhui);
  const resultat = [];
  for (let i = nombre - 1; i >= 0; i--) {
    const index = annee * 12 + (mois - 1) - i;
    const a = Math.floor(index / 12);
    const m = (index % 12) + 1;
    const fin = formaterDate(a, m, new Date(Date.UTC(a, m, 0)).getUTCDate());
    resultat.push({ cle: `${a}-${String(m).padStart(2, "0")}`, libelle: MOIS_COURTS[m - 1]!, fin });
  }
  return resultat;
}

function niveau(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  return 3;
}

export function calculerProgression(
  ref: Referentiel,
  seances: readonly Seance[],
  objectifs: readonly (Objectif & { mois: string })[],
  aujourdhui: DateISO,
  options: { mois?: number; semaines?: number } = {},
): Progression {
  const nbMois = options.mois ?? 6;
  const nbSemaines = options.semaines ?? 12;
  const valides = seances.filter((s) => s.date <= aujourdhui);

  // Versets appris (séances d'apprentissage), datés, pour le cumul.
  const intervallesDates: { date: DateISO; intervalle: Intervalle; vu: boolean }[] = [];
  for (const s of valides) {
    if (s.type !== "apprentissage") continue;
    for (const p of s.passages) {
      try {
        intervallesDates.push({ date: s.date, intervalle: versIntervalle(ref, p), vu: p.corrige === true });
      } catch {
        // passage incohérent : ignoré dans les statistiques
      }
    }
  }
  const compter = (liste: readonly Intervalle[]) =>
    fusionner(liste).reduce((t, [debut, fin]) => t + fin - debut + 1, 0);
  const tousIntervalles = intervallesDates.map((i) => i.intervalle);
  const versetsAppris = compter(tousIntervalles);
  const intervallesVus = intervallesDates.filter((i) => i.vu).map((i) => i.intervalle);
  const versetsVus = compter(intervallesVus);

  const mois = moisPrecedents(aujourdhui, nbMois);
  const cumulParMois = mois.map((m) => ({
    cle: m.cle,
    libelle: m.libelle,
    valeur: compter(intervallesDates.filter((i) => i.date <= m.fin).map((i) => i.intervalle)),
  }));

  // Minutes par semaine glissante (7 jours), la dernière se terminant aujourd'hui.
  const minutesParSemaine: BarreSemaine[] = [];
  for (let i = nbSemaines - 1; i >= 0; i--) {
    const fin = ajouterJours(aujourdhui, -7 * i);
    const debut = ajouterJours(fin, -6);
    const dans = valides.filter((s) => s.date >= debut && s.date <= fin);
    minutesParSemaine.push({
      debut,
      libelle: libelleCourt(debut),
      apprentissage: dans.filter((s) => s.type === "apprentissage").reduce((t, s) => t + s.dureeMin, 0),
      revision: dans.filter((s) => s.type === "revision").reduce((t, s) => t + s.dureeMin, 0),
    });
  }

  // Régularité : grille de semaines, du lundi au dimanche.
  const minutesParJour = new Map<DateISO, number>();
  for (const s of valides) minutesParJour.set(s.date, (minutesParJour.get(s.date) ?? 0) + s.dureeMin);
  const jourSemaine = (new Date(`${aujourdhui}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = lundi
  const premierLundi = ajouterJours(aujourdhui, -jourSemaine - 7 * (nbSemaines - 1));
  const regularite: CaseRegularite[][] = [];
  for (let c = 0; c < nbSemaines; c++) {
    const colonne: CaseRegularite[] = [];
    for (let l = 0; l < 7; l++) {
      const date = ajouterJours(premierLundi, c * 7 + l);
      const minutes = minutesParJour.get(date) ?? 0;
      colonne.push({ date, minutes, niveau: niveau(minutes), futur: date > aujourdhui });
    }
    regularite.push(colonne);
  }

  // Jours consécutifs avec au moins une séance, jusqu'à aujourd'hui (ou hier).
  let joursConsecutifs = 0;
  let curseur = minutesParJour.has(aujourdhui) ? aujourdhui : ajouterJours(aujourdhui, -1);
  while (minutesParJour.has(curseur)) {
    joursConsecutifs++;
    curseur = ajouterJours(curseur, -1);
  }

  const objectifsParMois = mois.map((m) => {
    const duMois = objectifs.filter((o) => o.mois.startsWith(m.cle));
    return {
      cle: m.cle,
      libelle: m.libelle,
      atteints: duMois.filter((o) => o.statut === "atteint").length,
      total: duMois.length,
    };
  });

  // Avancement par sourate (apprentissage) + dernière révision.
  const sourates: ProgressionSourate[] = [];
  for (const sourate of ref.values()) {
    const debut = sourate.premierVersetGlobal;
    const fin = debut + sourate.nbVersets - 1;
    const coupes: Intervalle[] = tousIntervalles
      .filter(([a, b]) => b >= debut && a <= fin)
      .map(([a, b]) => [Math.max(a, debut), Math.min(b, fin)] as const);
    const appris = compter(coupes);
    if (!appris) continue;
    const vus = compter(
      intervallesVus
        .filter(([a, b]) => b >= debut && a <= fin)
        .map(([a, b]) => [Math.max(a, debut), Math.min(b, fin)] as const),
    );
    const revisions = valides
      .filter((s) => s.type === "revision")
      .filter((s) =>
        s.passages.some((p) => {
          try {
            const [a, b] = versIntervalle(ref, p);
            return b >= debut && a <= fin;
          } catch {
            return false;
          }
        }),
      )
      .map((s) => s.date)
      .sort();
    sourates.push({
      sourate,
      versetsAppris: appris,
      versetsVus: vus,
      pourcentage: Math.round((appris / sourate.nbVersets) * 100),
      derniereRevision: revisions.at(-1) ?? null,
    });
  }
  sourates.sort((a, b) => b.sourate.numero - a.sourate.numero);

  return {
    versetsAppris,
    versetsVus,
    pourcentageCoran: pourcentageDuCoran(versetsAppris),
    souratesCompletes: sourates.filter((s) => s.pourcentage === 100).length,
    cumulParMois,
    minutesParSemaine,
    regularite,
    objectifsParMois,
    sourates,
    joursConsecutifs,
  };
}

/** Une sourate apprise mais pas révisée depuis longtemps est « à renforcer ». */
export function aRenforcer(s: ProgressionSourate, aujourdhui: DateISO, seuilJours = 30): boolean {
  if (!s.derniereRevision) return true;
  return joursEntre(s.derniereRevision, aujourdhui) > seuilJours;
}

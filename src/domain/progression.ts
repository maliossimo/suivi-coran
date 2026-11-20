/**
 * Indicateurs de progression d'un élève, calculés à partir de ses séances.
 * Code pur : les graphiques ne font qu'afficher ces résultats.
 */
import { formaterDate, lireDate, type DateISO } from "./calendrier";
import { joursEntre } from "./classe";
import { pagesApprises, type DecoupageMushaf } from "./acquis";
import { serieDeJours, type Objectif, type Seance } from "./fiche";
import type { Lecture } from "./lectures";
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

/** Un mois du travail de l'élève, pour comparer d'un mois à l'autre. */
export interface BilanMois {
  cle: string; // AAAA-MM
  libelle: string; // « nov. »
  seances: number;
  /** Jours où il y a eu au moins une séance. */
  joursTravailles: number;
  minutes: number;
  /** Versets ajoutés ce mois-là (apprentissage). */
  versets: number;
}

/** Variation en % entre deux valeurs, arrondie ; null s'il n'y a rien avant pour comparer. */
export function variationPourcent(actuel: number, precedent: number): number | null {
  if (precedent <= 0) return null;
  return Math.round(((actuel - precedent) / precedent) * 100);
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
  /** Parmi les versets appris, ceux que le Cheikh a écoutés (ou validés). */
  versetsVus: number;
  /** Parmi les versets appris, ceux que le Cheikh a validés : acquis. */
  versetsValides: number;
  pourcentage: number;
  derniereRevision: DateISO | null;
}

export interface Progression {
  versetsAppris: number;
  /** Versets appris que le Cheikh a vus (passages corrigés) : le reste est seulement déclaré. */
  versetsVus: number;
  /** Versets appris validés par le Cheikh : mémorisés. */
  versetsValides: number;
  /** Part du Coran apprise, en pages du mushaf (sinon en versets). */
  pourcentageCoran: number;
  /** Part du Coran apprise ET vue par le Cheikh. */
  pourcentageCoranVu: number;
  /** Pages du mushaf apprises (une page commencée compte en partie) ; null sans découpage du mushaf. */
  pagesApprises: number | null;
  /** Juz appris en entier ; null sans découpage du mushaf. */
  juzComplets: number | null;
  souratesCompletes: number;
  /** Sourates complètes dont tous les versets ont été vus par le Cheikh. */
  souratesCompletesVues: number;
  cumulParMois: PointMois[];
  /** Les mêmes mois, séances et temps de chacun, du plus ancien au plus récent (le dernier est en cours). */
  bilanParMois: BilanMois[];
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
  options: {
    mois?: number;
    semaines?: number;
    lecture?: Lecture;
    /** Découpage du mushaf : le pourcentage se compte alors en pages (604), plus juste que les versets. */
    pages?: DecoupageMushaf;
    /** « Ce que je connais déjà », en séances sans durée : comptées comme apprises, pas comme du temps. */
    acquis?: readonly Seance[];
  } = {},
): Progression {
  const nbMois = options.mois ?? 6;
  const nbSemaines = options.semaines ?? 12;
  const valides = seances.filter((s) => s.date <= aujourdhui);
  // Pour ce qui est connu (versets, sourates, révisions) : les séances et les acquis déclarés.
  const avecAcquis = [...valides, ...(options.acquis ?? []).filter((s) => s.date <= aujourdhui)];

  // Versets appris (séances d'apprentissage), datés, pour le cumul.
  const intervallesDates: { date: DateISO; intervalle: Intervalle; vu: boolean; valide: boolean }[] = [];
  for (const s of avecAcquis) {
    if (s.type !== "apprentissage") continue;
    for (const p of s.passages) {
      try {
        intervallesDates.push({
          date: s.date,
          intervalle: versIntervalle(ref, p),
          vu: p.corrige === true || p.valide === true,
          valide: p.valide === true,
        });
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
  const intervallesValides = intervallesDates.filter((i) => i.valide).map((i) => i.intervalle);
  const versetsValides = compter(intervallesValides);

  const mois = moisPrecedents(aujourdhui, nbMois);
  const cumulParMois = mois.map((m) => ({
    cle: m.cle,
    libelle: m.libelle,
    valeur: compter(intervallesDates.filter((i) => i.date <= m.fin).map((i) => i.intervalle)),
  }));

  const bilanParMois: BilanMois[] = mois.map((m, i) => {
    const debut = `${m.cle}-01`;
    const dans = valides.filter((s) => s.date >= debut && s.date <= m.fin);
    const avant =
      i === 0
        ? compter(intervallesDates.filter((x) => x.date < debut).map((x) => x.intervalle))
        : cumulParMois[i - 1]!.valeur;
    return {
      cle: m.cle,
      libelle: m.libelle,
      seances: dans.length,
      joursTravailles: new Set(dans.map((s) => s.date)).size,
      minutes: dans.reduce((t, s) => t + s.dureeMin, 0),
      versets: Math.max(0, cumulParMois[i]!.valeur - avant),
    };
  });

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
  const joursConsecutifs = serieDeJours(minutesParJour.keys(), aujourdhui);

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
    const dansSourate = (liste: readonly Intervalle[]) =>
      compter(
        liste
          .filter(([a, b]) => b >= debut && a <= fin)
          .map(([a, b]) => [Math.max(a, debut), Math.min(b, fin)] as const),
      );
    const vus = dansSourate(intervallesVus);
    const validesSourate = dansSourate(intervallesValides);
    const revisions = avecAcquis
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
      versetsValides: validesSourate,
      pourcentage: Math.round((appris / sourate.nbVersets) * 100),
      derniereRevision: revisions.at(-1) ?? null,
    });
  }
  sourates.sort((a, b) => b.sourate.numero - a.sourate.numero);

  // Part du Coran : en pages du mushaf quand on a son découpage (604 pages), sinon en versets.
  const enPages = options.pages ? pagesApprises(ref, options.pages, tousIntervalles) : null;
  const enPagesVus = options.pages ? pagesApprises(ref, options.pages, intervallesVus) : null;
  const totalPages = options.pages?.pages.length ?? 604;
  const enPourcent = (pages: number) => Math.round((pages / totalPages) * 1000) / 10;

  return {
    versetsAppris,
    versetsVus,
    versetsValides,
    pourcentageCoran: enPages
      ? enPourcent(enPages.pages)
      : pourcentageDuCoran(versetsAppris, options.lecture),
    pourcentageCoranVu: enPagesVus
      ? enPourcent(enPagesVus.pages)
      : pourcentageDuCoran(versetsVus, options.lecture),
    pagesApprises: enPages ? Math.round(enPages.pages * 10) / 10 : null,
    juzComplets: enPages?.juzComplets ?? null,
    souratesCompletes: sourates.filter((s) => s.pourcentage === 100).length,
    souratesCompletesVues: sourates.filter(
      (s) => s.pourcentage === 100 && s.versetsVus >= s.sourate.nbVersets,
    ).length,
    cumulParMois,
    minutesParSemaine,
    regularite,
    objectifsParMois,
    bilanParMois,
    sourates,
    joursConsecutifs,
  };
}

/** Une sourate apprise mais pas révisée depuis longtemps est « à renforcer ». */
export function aRenforcer(s: ProgressionSourate, aujourdhui: DateISO, seuilJours = 30): boolean {
  if (!s.derniereRevision) return true;
  return joursEntre(s.derniereRevision, aujourdhui) > seuilJours;
}

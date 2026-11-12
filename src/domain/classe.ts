/**
 * Résumé de la classe pour le tableau de bord du maître. Code pur.
 */
import type { DateISO } from "./calendrier";
import type { StatutObjectif, TypeSeance } from "./fiche";

export interface EleveClasse {
  id: string;
  prenom: string;
  nom: string;
  actif: boolean;
}

export interface SeanceStat {
  eleveId: string;
  type: TypeSeance;
  date: DateISO;
  dureeMin: number;
}

export interface ObjectifStat {
  eleveId: string;
  statut: StatutObjectif;
}

export interface ResumeEleve {
  eleve: EleveClasse;
  minutesApprentissage: number;
  minutesRevision: number;
  joursTravailles: number;
  objectifsAtteints: number;
  objectifsTotal: number;
  derniereSaisie: DateISO | null;
  /** Jours écoulés depuis la dernière saisie (null si jamais). */
  joursSansSaisie: number | null;
  /** Rien saisi depuis au moins `SEUIL_ALERTE` jours (ou jamais). */
  alerte: boolean;
  /** Séances récentes que le Cheikh n'a pas encore vues (ou ajouts après sa correction). */
  aVoir: number;
}

/** Fenêtre de la file « à voir » du Cheikh : les séances plus anciennes n'y figurent plus. */
export const JOURS_A_VOIR = 30;

export const SEUIL_ALERTE = 3;

/** Nombre de jours entre deux dates ISO (b - a). */
export function joursEntre(a: DateISO, b: DateISO): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function resumerClasse(
  eleves: readonly EleveClasse[],
  seancesDuMois: readonly SeanceStat[],
  objectifsDuMois: readonly ObjectifStat[],
  dernieresSaisies: ReadonlyMap<string, DateISO>,
  aujourdhui: DateISO,
  seancesAVoir: ReadonlyMap<string, number> = new Map(),
): ResumeEleve[] {
  return trierParPrenom(eleves).map((eleve) => {
    const seances = seancesDuMois.filter((s) => s.eleveId === eleve.id);
    const objectifs = objectifsDuMois.filter((o) => o.eleveId === eleve.id);
    const derniere = dernieresSaisies.get(eleve.id) ?? null;
    const joursSansSaisie = derniere ? joursEntre(derniere, aujourdhui) : null;
    const somme = (type: TypeSeance) =>
      seances.filter((s) => s.type === type).reduce((t, s) => t + s.dureeMin, 0);
    return {
      eleve,
      minutesApprentissage: somme("apprentissage"),
      minutesRevision: somme("revision"),
      joursTravailles: new Set(seances.map((s) => s.date)).size,
      objectifsAtteints: objectifs.filter((o) => o.statut === "atteint").length,
      objectifsTotal: objectifs.length,
      derniereSaisie: derniere,
      joursSansSaisie,
      alerte: eleve.actif && (joursSansSaisie === null || joursSansSaisie >= SEUIL_ALERTE),
      aVoir: seancesAVoir.get(eleve.id) ?? 0,
    };
  });
}

/** « aujourd'hui », « hier », « il y a 4 jours », « jamais » */
export function libelleDerniereSaisie(jours: number | null): string {
  if (jours === null) return "jamais";
  if (jours <= 0) return "aujourd’hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} jours`;
}

/**
 * Phrase d'état d'un élève pour la liste du Cheikh :
 * « A saisi aujourd'hui », « A saisi hier », « Rien depuis 4 jours », « N'a encore rien saisi ».
 */
export function phraseEleve(jours: number | null): string {
  if (jours === null) return "N’a encore rien saisi";
  if (jours <= 0) return "A saisi aujourd’hui";
  if (jours === 1) return "A saisi hier";
  return `Rien depuis ${jours} jours`;
}

// ---------- Recherche, tri et confirmation ---------------------------------

/** Texte comparable : sans accents, sans majuscules, espaces réduits. */
export function normaliserNom(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const comparateur = new Intl.Collator("fr", { sensitivity: "base" });

/** Tri par prénom puis par nom, dans l'ordre alphabétique français (« Émile » avec les E). */
export function trierParPrenom<T extends { prenom: string; nom: string }>(eleves: readonly T[]): T[] {
  return [...eleves].sort(
    (a, b) => comparateur.compare(a.prenom, b.prenom) || comparateur.compare(a.nom, b.nom),
  );
}

/** Vrai si chaque mot de la recherche apparaît dans le prénom ou le nom. */
export function correspondARecherche(eleve: { prenom: string; nom: string }, recherche: string): boolean {
  const mots = normaliserNom(recherche).split(" ").filter(Boolean);
  if (mots.length === 0) return true;
  const cible = normaliserNom(`${eleve.prenom} ${eleve.nom}`);
  return mots.every((mot) => cible.includes(mot));
}

/** La confirmation de suppression attend le prénom de l'élève (accents et majuscules ignorés). */
export function confirmationValide(prenom: string, saisie: string): boolean {
  const attendu = normaliserNom(prenom);
  return attendu.length > 0 && normaliserNom(saisie) === attendu;
}

/** « de Karim », « d’Ilyes », « d’Élève Test » : élision devant une voyelle. */
export function deNom(nom: string): string {
  const propre = nom.trim();
  return /^[aeiouyàâäéèêëîïôöûüÿæœ]/i.test(propre) ? `d’${propre}` : `de ${propre}`;
}

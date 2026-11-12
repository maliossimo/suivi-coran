import "server-only";
import { z } from "zod";
import { debutDuMois, lireDate, type DateISO, type NumeroSemaine } from "@/domain/calendrier";
import {
  conflitDeSaisie,
  construireFiche,
  TYPES_SEANCE,
  dernierJour,
  lireMois,
  positionDuMois,
  premierJour,
  type Bilan,
  type Mois,
  type PositionMois,
  type Objectif,
  type Seance,
  type SemaineFiche,
  type StatutObjectif,
  type TypeSeance,
} from "@/domain/fiche";
import {
  creerReferentiel,
  nbVersetsDistincts,
  lirePassageTexte,
  passageSuivant,
  premierChevauchement,
  versIntervalle,
  type Passage,
  type Sourate,
} from "@/domain/versets";
import { bilanDuMois, enregistrerBilan } from "@/repositories/bilans";
import { commentairesDe, commentairesDuJour, type Commentaire } from "@/repositories/commentaires";
import { enregistrerObjectif, objectifsDuMois } from "@/repositories/objectifs";
import {
  derniereSeanceAvecPassagesAvant,
  enregistrerSeance,
  seanceDuJour,
  seancesEntre,
  supprimerSeance,
  validerSeance,
} from "@/repositories/seances";
import { listerSourates } from "@/repositories/sourates";

/** Date du jour à Paris (les élèves et la base raisonnent en heure de Paris). */
export function aujourdhuiParis(): DateISO {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function lireType(valeur: string | undefined): TypeSeance {
  return valeur === "revision" ? "revision" : "apprentissage";
}

export interface Fiche {
  mois: Mois;
  /** Mois en cours (à Paris), pour la navigation rapide. */
  moisCourant: Mois;
  /** Passé, en cours ou à venir : un mois à venir sert à préparer ses objectifs. */
  position: PositionMois;
  type: TypeSeance;
  semaines: SemaineFiche[];
  objectifMensuel: Objectif | null;
  totalMinutes: number;
  joursTravailles: number;
  /** Versets distincts travaillés dans le mois (tous passages confondus). */
  versetsTravailles: number;
  sourates: Sourate[];
}

export async function chargerFiche(eleveId: string, moisParam?: string, typeParam?: string): Promise<Fiche> {
  const aujourdhui = aujourdhuiParis();
  const mois = lireMois(moisParam, aujourdhui);
  const position = positionDuMois(mois, aujourdhui);
  const type = lireType(typeParam);
  const [seances, objectifs, sourates] = await Promise.all([
    position === "futur" ? [] : seancesEntre(eleveId, type, premierJour(mois), dernierJour(mois)),
    objectifsDuMois(eleveId, type, premierJour(mois)),
    listerSourates(),
  ]);
  const semaines = construireFiche(mois, seances, objectifs, aujourdhui);
  return {
    mois,
    moisCourant: lireMois(undefined, aujourdhui),
    position,
    type,
    semaines,
    objectifMensuel: objectifs.find((o) => o.semaine === null) ?? null,
    totalMinutes: semaines.reduce((t, s) => t + s.totalMinutes, 0),
    joursTravailles: semaines.reduce((t, s) => t + s.joursTravailles, 0),
    versetsTravailles: nbVersetsDistincts(
      creerReferentiel(sourates),
      seances.flatMap((s) => s.passages),
    ),
    sourates,
  };
}

/** Date valide et pas dans le futur ; sinon null. */
export function lireDateSaisissable(valeur: string | undefined): DateISO | null {
  if (!valeur) return null;
  try {
    lireDate(valeur);
  } catch {
    return null;
  }
  return valeur <= aujourdhuiParis() ? valeur : null;
}

export interface DonneesSeance {
  date: DateISO;
  type: TypeSeance;
  seance: Seance | null;
  commentaires: Commentaire[];
  sourates: Sourate[];
  /** Suite logique du dernier passage travaillé (proposée en un toucher). */
  suggestion: Passage | null;
  /** Passage à préremplir (déjà ajouté au formulaire). */
  propose: Passage | null;
}

export async function chargerSeance(
  eleveId: string,
  date: DateISO,
  type: TypeSeance,
  /** Passage proposé par l'adresse (bouton « Réviser » de la progression), ex. « 2:142-202 ». */
  passagePropose?: string,
): Promise<DonneesSeance> {
  // Tout en parallèle : les commentaires sont retrouvés par le jour, sans attendre la séance.
  const [seance, sourates, precedente, commentaires] = await Promise.all([
    seanceDuJour(eleveId, type, date),
    listerSourates(),
    derniereSeanceAvecPassagesAvant(eleveId, type, date),
    commentairesDuJour(eleveId, type, date),
  ]);
  const ref = creerReferentiel(sourates);
  const dernier = precedente?.passages.at(-1);
  const suggestion = dernier ? passageSuivant(ref, dernier) : null;
  const propose = lirePassageTexte(ref, passagePropose);
  return { date, type, seance, commentaires, sourates, suggestion, propose };
}

// ---------- Saisie d'une séance ----------------------------------------

const entier = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const schemaPassage = z.object({
  sourateDebut: entier(1, 114),
  versetDebut: entier(1, 286),
  sourateFin: entier(1, 114),
  versetFin: entier(1, 286),
});

export const schemaSaisieSeance = z.object({
  date: z.string(),
  type: z.enum(["apprentissage", "revision"]),
  dureeMin: entier(0, 600),
  tajwid: z.string().trim().max(1000),
  noteLibre: z.string().trim().max(2000),
  passages: z.array(schemaPassage).max(20),
});

export type ResultatSaisie = { ok: true } | { ok: false; erreur: string; conflit?: true };

/** La séance telle que l'élève l'avait sous les yeux en saisissant (null : aucune). */
const schemaAttendu = z
  .object({
    dureeMin: entier(0, 600),
    noteLibre: z.string().max(2000).nullable(),
    passages: z.array(schemaPassage).max(20),
  })
  .nullable();

export const MESSAGE_CONFLIT =
  "La séance a changé entre-temps (correction du Cheikh ou autre téléphone). Rouvre-la pour choisir quoi garder.";

/**
 * `attenduBrut` (facultatif) : la version de la séance sur laquelle l'élève a travaillé.
 * Si la base a changé depuis, rien n'est écrasé (enregistrement hors ligne ou renvoyé plus tard).
 */
export async function enregistrerSeanceEleve(
  eleveId: string,
  brut: unknown,
  attenduBrut?: unknown,
): Promise<ResultatSaisie> {
  const saisie = schemaSaisieSeance.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: "Certaines informations sont invalides." };
  const date = lireDateSaisissable(saisie.data.date);
  if (!date) return { ok: false, erreur: "On ne peut pas saisir une séance dans le futur." };
  if (saisie.data.dureeMin === 0 && saisie.data.passages.length === 0 && !saisie.data.tajwid) {
    return {
      ok: false,
      erreur: "Indique au moins une durée ou un passage.",
    };
  }

  // Vérifie chaque passage contre le référentiel (versets dans les bornes, ordre début → fin).
  const ref = creerReferentiel(await listerSourates());
  const passages: Passage[] = saisie.data.passages;
  for (const [i, p] of passages.entries()) {
    try {
      versIntervalle(ref, p);
    } catch (e) {
      return { ok: false, erreur: `Passage ${i + 1} : ${(e as Error).message}` };
    }
  }
  const doublon = premierChevauchement(passages);
  if (doublon) {
    return {
      ok: false,
      erreur: `Les passages ${doublon[0] + 1} et ${doublon[1] + 1} se répètent ou se chevauchent : garde-en un seul.`,
    };
  }

  let tajwid = saisie.data.tajwid;
  if (attenduBrut !== undefined) {
    const attendu = schemaAttendu.safeParse(attenduBrut);
    if (!attendu.success) return { ok: false, erreur: "Certaines informations sont invalides." };
    const actuelle = await seanceDuJour(eleveId, saisie.data.type, date);
    if (conflitDeSaisie(attendu.data, actuelle, { ...saisie.data, passages })) {
      return { ok: false, erreur: MESSAGE_CONFLIT, conflit: true };
    }
    tajwid ||= actuelle?.tajwid ?? ""; // ancienne donnée conservée (le tajwid n'est plus saisi)
  }
  await enregistrerSeance(eleveId, { ...saisie.data, tajwid, date, passages });
  return { ok: true };
}

/** Validation en un geste par le Cheikh : tous les passages de la séance sont « vus ». */
export async function validerSeanceEleve(
  acteur: { role: string },
  seanceBrute: unknown,
): Promise<ResultatSaisie> {
  if (acteur.role !== "maitre" && acteur.role !== "admin") {
    return { ok: false, erreur: "Seul le Cheikh peut valider une séance." };
  }
  const seanceId = z.string().uuid().safeParse(seanceBrute);
  if (!seanceId.success) return { ok: false, erreur: "Séance introuvable." };
  try {
    await validerSeance(seanceId.data);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "La séance n'a pas pu être validée. Réessaie." };
  }
}

export async function supprimerSeanceEleve(eleveId: string, typeBrut: unknown, dateBrute: unknown) {
  const type = z.enum(["apprentissage", "revision"]).safeParse(typeBrut);
  const date = lireDateSaisissable(typeof dateBrute === "string" ? dateBrute : undefined);
  if (!type.success || !date) return;
  await supprimerSeance(eleveId, type.data, date);
}

// ---------- Objectifs ----------------------------------------------------

const schemaObjectif = z.object({
  type: z.enum(["apprentissage", "revision"]),
  mois: z.string().regex(/^\d{4}-\d{2}-01$/),
  semaine: z.union([z.literal(""), entier(1, 5)]),
  description: z.string().trim().min(1).max(300),
  statut: z.enum(["en_cours", "atteint", "non_atteint"]),
});

export async function enregistrerObjectifEleve(eleveId: string, brut: unknown): Promise<ResultatSaisie> {
  const saisie = schemaObjectif.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: "Objectif invalide (300 caractères maximum)." };
  const { type, mois, semaine, description, statut } = saisie.data;
  await enregistrerObjectif(eleveId, {
    type,
    mois: debutDuMois(mois),
    semaine: semaine === "" ? null : (semaine as NumeroSemaine),
    description,
    statut: statut as StatutObjectif,
  });
  return { ok: true };
}

// ---------- Bilan du mois ------------------------------------------------

/** Bilan du mois et mots du maître (chargés à part, après la fiche). */
export async function chargerBilan(
  eleveId: string,
  type: TypeSeance,
  mois: Mois,
): Promise<{ bilan: Bilan | null; commentaires: Commentaire[] }> {
  const bilan = await bilanDuMois(eleveId, type, premierJour(mois));
  const commentaires = bilan ? await commentairesDe({ bilanId: bilan.id }) : [];
  return { bilan, commentaires };
}

const schemaBilan = z.object({
  type: z.enum(["apprentissage", "revision"]),
  mois: z.string().regex(/^\d{4}-\d{2}-01$/),
  bienMemorise: z.string().trim().max(1000),
  aRenforcer: z.string().trim().max(1000),
});

export async function enregistrerBilanEleve(eleveId: string, brut: unknown): Promise<ResultatSaisie> {
  const saisie = schemaBilan.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: "Bilan invalide (1000 caractères maximum par champ)." };
  const { type, mois, bienMemorise, aRenforcer } = saisie.data;
  if (mois > debutDuMois(aujourdhuiParis())) {
    return { ok: false, erreur: "Le bilan s'écrit pendant ou après le mois, pas à l'avance." };
  }
  if (!bienMemorise && !aRenforcer) {
    return { ok: false, erreur: "Écris au moins ce qui est bien mémorisé ou ce qui est à renforcer." };
  }
  await enregistrerBilan(eleveId, { type, mois: debutDuMois(mois), bienMemorise, aRenforcer });
  return { ok: true };
}

// ---------- Fiche imprimable (PDF) ----------------------------------------

export interface FicheImprimable {
  mois: Mois;
  parties: { fiche: Fiche; bilan: Bilan | null }[];
  /** Date d'édition, imprimée en bas de la fiche. */
  editeeLe: DateISO;
}

/** Les deux fiches du mois (apprentissage puis révision) avec leur bilan, pour l'impression. */
export async function chargerFicheImprimable(eleveId: string, moisParam?: string): Promise<FicheImprimable> {
  const parties = await Promise.all(
    TYPES_SEANCE.map(async (type) => {
      const fiche = await chargerFiche(eleveId, moisParam, type);
      const { bilan } =
        fiche.position === "futur" ? { bilan: null } : await chargerBilan(eleveId, type, fiche.mois);
      return { fiche, bilan };
    }),
  );
  return { mois: parties[0]!.fiche.mois, parties, editeeLe: aujourdhuiParis() };
}

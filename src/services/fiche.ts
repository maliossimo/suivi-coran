import "server-only";
import { z } from "zod";
import { debutDuMois, lireDate, type DateISO, type NumeroSemaine } from "@/domain/calendrier";
import {
  construireFiche,
  dernierJour,
  lireMois,
  premierJour,
  type Mois,
  type Objectif,
  type Seance,
  type SemaineFiche,
  type StatutObjectif,
  type TypeSeance,
} from "@/domain/fiche";
import { creerReferentiel, versIntervalle, type Passage, type Sourate } from "@/domain/versets";
import { commentairesDeSeance, type Commentaire } from "@/repositories/commentaires";
import { enregistrerObjectif, objectifsDuMois } from "@/repositories/objectifs";
import { enregistrerSeance, seanceDuJour, seancesEntre, supprimerSeance } from "@/repositories/seances";
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
  type: TypeSeance;
  semaines: SemaineFiche[];
  objectifMensuel: Objectif | null;
  totalMinutes: number;
  joursTravailles: number;
  sourates: Sourate[];
}

export async function chargerFiche(eleveId: string, moisParam?: string, typeParam?: string): Promise<Fiche> {
  const aujourdhui = aujourdhuiParis();
  const mois = lireMois(moisParam, aujourdhui);
  const type = lireType(typeParam);
  const [seances, objectifs, sourates] = await Promise.all([
    seancesEntre(eleveId, type, premierJour(mois), dernierJour(mois)),
    objectifsDuMois(eleveId, type, premierJour(mois)),
    listerSourates(),
  ]);
  const semaines = construireFiche(mois, seances, objectifs, aujourdhui);
  return {
    mois,
    type,
    semaines,
    objectifMensuel: objectifs.find((o) => o.semaine === null) ?? null,
    totalMinutes: semaines.reduce((t, s) => t + s.totalMinutes, 0),
    joursTravailles: semaines.reduce((t, s) => t + s.joursTravailles, 0),
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
}

export async function chargerSeance(
  eleveId: string,
  date: DateISO,
  type: TypeSeance,
): Promise<DonneesSeance> {
  const [seance, sourates] = await Promise.all([seanceDuJour(eleveId, type, date), listerSourates()]);
  const commentaires = seance ? await commentairesDeSeance(seance.id) : [];
  return { date, type, seance, commentaires, sourates };
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

export type ResultatSaisie = { ok: true } | { ok: false; erreur: string };

export async function enregistrerSeanceEleve(eleveId: string, brut: unknown): Promise<ResultatSaisie> {
  const saisie = schemaSaisieSeance.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: "Certaines informations sont invalides." };
  const date = lireDateSaisissable(saisie.data.date);
  if (!date) return { ok: false, erreur: "On ne peut pas saisir une séance dans le futur." };
  if (saisie.data.dureeMin === 0 && saisie.data.passages.length === 0 && !saisie.data.tajwid) {
    return {
      ok: false,
      erreur: "Indique au moins une durée, un passage ou ce que tu as travaillé en tajwid.",
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

  await enregistrerSeance(eleveId, { ...saisie.data, date, passages });
  return { ok: true };
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

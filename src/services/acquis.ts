import "server-only";
import { z } from "zod";
import { juzCouverts, passageDeSourates, passagesDesJuz, type Acquis } from "@/domain/acquis";
import { creerReferentiel, libellePassage, type Passage } from "@/domain/versets";
import {
  acquisDe,
  acquisRepondu,
  ajouterAcquis,
  changerEcouteDemandee,
  marquerAcquis,
  marquerAcquisRepondu,
  retirerAcquis,
} from "@/repositories/acquis";
import { pagesMushaf } from "@/repositories/coran";
import { lectureEleve, type Profil } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";
import type { Lecture } from "@/domain/lectures";

export type ResultatAcquis = { ok: true } | { ok: false; erreur: string };

export interface PageAcquis {
  lecture: Lecture;
  sourates: { numero: number; nomLatin: string; nomAr: string }[];
  /** Les juz déjà entièrement déclarés (cochés d'avance). */
  juzConnus: number[];
  acquis: (Acquis & { libelle: string })[];
}

/** « Ce que je connais déjà » : ce qu'il faut pour l'écran de l'élève. */
export async function chargerPageAcquis(eleveId: string): Promise<PageAcquis> {
  const lecture = await lectureEleve(eleveId);
  const [sourates, decoupage, acquis] = await Promise.all([
    listerSourates(lecture),
    pagesMushaf(lecture),
    acquisDe(eleveId),
  ]);
  const ref = creerReferentiel(sourates);
  return {
    lecture,
    sourates: sourates.map((s) => ({ numero: s.numero, nomLatin: s.nomLatin, nomAr: s.nomAr })),
    juzConnus: juzCouverts(
      ref,
      decoupage,
      acquis.map((a) => a.passage),
    ),
    acquis: acquis.map((a) => ({ ...a, libelle: libellePassage(ref, a.passage) })),
  };
}

/** Faut-il proposer l'écran à cet élève (nouveau, ou déjà inscrit avant la fonctionnalité) ? */
export async function doitDeclarerAcquis(profil: Profil): Promise<boolean> {
  if (profil.role !== "eleve") return false;
  return !(await acquisRepondu(profil.id));
}

const schemaDeclaration = z.object({
  juz: z.array(z.number().int().min(1).max(30)).max(30),
  parties: z
    .array(z.object({ de: z.number().int().min(1).max(114), a: z.number().int().min(1).max(114) }))
    .max(20),
  aEcouter: z.boolean(),
});

/** L'élève ajoute ce qu'il connaît (juz et/ou sourates) ; il a alors répondu. */
export async function declarerAcquis(profil: Profil, brut: unknown): Promise<ResultatAcquis> {
  if (profil.role !== "eleve" || !profil.actif) return { ok: false, erreur: "Réservé aux élèves." };
  const d = schemaDeclaration.safeParse(brut);
  if (!d.success) return { ok: false, erreur: "Choix invalide : recharge la page." };
  const lecture = await lectureEleve(profil.id);
  const [sourates, decoupage] = await Promise.all([listerSourates(lecture), pagesMushaf(lecture)]);
  const ref = creerReferentiel(sourates);
  const juz = passagesDesJuz(decoupage);
  const passages: Passage[] = [
    ...[...new Set(d.data.juz)].sort((a, b) => a - b).map((n) => juz[n - 1]!),
    ...d.data.parties.flatMap((p) => {
      const passage = passageDeSourates(ref, p.de, p.a);
      return passage ? [passage] : [];
    }),
  ];
  try {
    await ajouterAcquis(profil.id, passages, d.data.aEcouter);
    await marquerAcquisRepondu();
    return { ok: true };
  } catch {
    return { ok: false, erreur: "L’enregistrement n’a pas pu se faire. Réessaie." };
  }
}

/** « Je ne connais encore rien » ou « Plus tard » : on ne redemande plus (modifiable depuis la Progression). */
export async function repondreSansAcquis(profil: Profil): Promise<void> {
  if (profil.role !== "eleve") return;
  await marquerAcquisRepondu().catch(() => undefined);
}

const uuid = z.string().uuid();

export async function retirerUnAcquis(profil: Profil, idBrut: unknown): Promise<ResultatAcquis> {
  const id = uuid.safeParse(idBrut);
  if (!id.success || profil.role !== "eleve") return { ok: false, erreur: "Partie introuvable." };
  try {
    await retirerAcquis(profil.id, id.data);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "La suppression n’a pas pu se faire. Réessaie." };
  }
}

export async function changerEcoute(
  profil: Profil,
  idBrut: unknown,
  aEcouter: unknown,
): Promise<ResultatAcquis> {
  const id = uuid.safeParse(idBrut);
  if (!id.success || typeof aEcouter !== "boolean" || profil.role !== "eleve")
    return { ok: false, erreur: "Partie introuvable." };
  try {
    await changerEcouteDemandee(profil.id, id.data, aEcouter);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Le changement n’a pas pu se faire. Réessaie." };
  }
}

/** Le Cheikh (ou l'admin) marque une partie déclarée : écoutée, validée, ou rien. */
export async function marquerUnAcquis(
  profil: Profil,
  idBrut: unknown,
  etatBrut: unknown,
): Promise<ResultatAcquis> {
  const id = uuid.safeParse(idBrut);
  const etat = z.enum(["aucun", "ecoute", "valide"]).safeParse(etatBrut);
  if (!id.success || !etat.success) return { ok: false, erreur: "Partie introuvable." };
  // L'élève (pour lui-même, la base le vérifie) ou son Cheikh : « passé avec le Cheikh ».
  if (!profil.actif) return { ok: false, erreur: "Compte désactivé." };
  try {
    await marquerAcquis(id.data, etat.data);
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Le changement n’a pas pu être enregistré. Réessaie." };
  }
}

import "server-only";
import { z } from "zod";
import { lireLecture, type Lecture } from "@/domain/lectures";
import type { Sourate } from "@/domain/versets";
import { recitateurs, versetsSourate, type Recitateur } from "@/repositories/coran";
import type { Profil } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";

export interface PageCoran {
  lecture: Lecture;
  sourates: Sourate[];
  sourate: Sourate;
  versets: string[];
  /** Récitateurs qui ont enregistré cette sourate dans cette lecture ; null si le service est injoignable. */
  recitateurs: Recitateur[] | null;
}

const schemaSourate = z.coerce.number().int().min(1).max(114).catch(1);

/** Lecture du Coran : pour l'instant réservée à l'administrateur. */
export async function chargerPageCoran(
  acteur: Profil,
  parametres: { lecture?: string; sourate?: string },
): Promise<PageCoran> {
  if (acteur.role !== "admin" || !acteur.actif) throw new Error("Réservé à l'administrateur.");
  const lecture = lireLecture(parametres.lecture);
  const numero = schemaSourate.parse(parametres.sourate);
  const [sourates, versets, liste] = await Promise.all([
    listerSourates(lecture),
    versetsSourate(lecture, numero),
    recitateurs(lecture).catch(() => null),
  ]);
  const sourate = sourates.find((s) => s.numero === numero) ?? sourates[0]!;
  return {
    lecture,
    sourates,
    sourate,
    versets,
    recitateurs: liste ? liste.filter((r) => r.sourates.includes(numero)) : null,
  };
}

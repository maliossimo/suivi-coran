import "server-only";
import { z } from "zod";
import type { SegmentTajwid } from "@/domain/coran";
import { lireLecture, type Lecture } from "@/domain/lectures";
import type { Sourate } from "@/domain/versets";
import {
  recitateurs,
  recitationsVersets,
  tajwidSourate,
  versetsSourate,
  type Recitation,
} from "@/repositories/coran";
import type { Profil } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";

export interface PageCoran {
  lecture: Lecture;
  sourates: Sourate[];
  sourate: Sourate;
  /** Texte du Complexe du Roi Fahd (chaque verset finit par sa rosace numérotée). */
  versets: string[];
  /** Hafs : même sourate découpée pour colorer le tajwid ; null en Warsh. */
  tajwid: SegmentTajwid[][] | null;
  /** D'abord les récitations où le texte suit, puis l'écoute seule. */
  recitations: Recitation[];
  /** La bibliothèque des récitations sourate entière a répondu. */
  bibliothequeDisponible: boolean;
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
  const [sourates, versets, tajwid, bibliotheque] = await Promise.all([
    listerSourates(lecture),
    versetsSourate(lecture, numero),
    lecture === "hafs" ? tajwidSourate(numero) : Promise.resolve(null),
    recitateurs(lecture).catch(() => null),
  ]);
  const sourate = sourates.find((s) => s.numero === numero) ?? sourates[0]!;
  const sourateEntiere: Recitation[] = (bibliotheque ?? [])
    .filter((r) => r.sourates.includes(numero))
    .map((r) => ({ id: `mp3-${r.id}`, nom: r.nom, style: r.style, suivi: false, source: r.serveur }));
  return {
    lecture,
    sourates,
    sourate,
    versets,
    tajwid,
    recitations: [...recitationsVersets(lecture), ...sourateEntiere],
    bibliothequeDisponible: bibliotheque !== null,
  };
}

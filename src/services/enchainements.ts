import "server-only";
import { z } from "zod";
import { enchainementsConnus, type EnchainementPossible } from "@/domain/enchainements";
import { lireLecture, type Lecture } from "@/domain/lectures";
import { creerReferentiel } from "@/domain/versets";
import { acquisDe } from "@/repositories/acquis";
import { versetsSourate } from "@/repositories/coran";
import type { Profil } from "@/repositories/profils";
import { historiquePourProgression } from "@/repositories/seances";
import { listerSourates } from "@/repositories/sourates";
import { aujourdhuiParis } from "./fiche";

export interface PageEnchainements {
  lecture: Lecture;
  sourates: { numero: number; nomLatin: string; nomAr: string }[];
  possibles: EnchainementPossible[];
}

/** Ce que l'élève connaît (séances et « Ce que je connais ») : les enchaînements à lui poser. */
export async function chargerEnchainements(profil: Profil): Promise<PageEnchainements> {
  const lecture = lireLecture(profil.lecture ?? "hafs");
  const [seances, acquis, sourates] = await Promise.all([
    historiquePourProgression(profil.id, aujourdhuiParis()),
    acquisDe(profil.id).catch(() => []),
    listerSourates(lecture),
  ]);
  const ref = creerReferentiel(sourates);
  const passages = [...seances.flatMap((s) => s.passages), ...acquis.map((a) => a.passage)];
  const possibles = enchainementsConnus(ref, passages);
  const utiles = new Set(possibles.map((p) => p.sourate));
  return {
    lecture,
    sourates: sourates
      .filter((s) => utiles.has(s.numero))
      .map((s) => ({ numero: s.numero, nomLatin: s.nomLatin, nomAr: s.nomAr })),
    possibles,
  };
}

/** Textes d'une sourate dans la lecture de l'élève (pour afficher la question et la réponse). */
export async function textesPourEnchainement(profil: Profil | null, brut: unknown): Promise<string[]> {
  if (!profil || !profil.actif || profil.role !== "eleve") return [];
  const s = z.number().int().min(1).max(114).safeParse(brut);
  if (!s.success) return [];
  return versetsSourate(lireLecture(profil.lecture ?? "hafs"), s.data).catch(() => []);
}

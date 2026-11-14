import "server-only";
import { z } from "zod";
import { essaisDuPassage, motsDifficiles, type MotDifficile } from "@/domain/essais";
import { enregistrerEssai, listerMesEssais } from "@/repositories/essais";
import type { Profil } from "@/repositories/profils";
import { peutOuvrirCoran } from "@/services/coran";

const schemaPassage = z
  .object({
    lecture: z.enum(["hafs", "warsh"]),
    sourate: z.number().int().min(1).max(114),
    du: z.number().int().min(1).max(286),
    au: z.number().int().min(1).max(286),
  })
  .refine((p) => p.au >= p.du, "Passage invalide.");

const schemaEssai = schemaPassage.and(
  z.object({
    score: z.number().int().min(0).max(100),
    fautes: z
      .array(
        z.object({
          verset: z.number().int().min(1).max(286),
          mot: z.string().min(1).max(60),
          regle: z.string().max(60),
        }),
      )
      .max(40),
  }),
);

/** Garde un essai du mode Réciter (en silence : un échec ne gêne pas l'élève). */
export async function garderEssai(profil: Profil | null, brut: unknown): Promise<void> {
  if (!profil || !profil.actif || !peutOuvrirCoran(profil)) return;
  const e = schemaEssai.safeParse(brut);
  if (!e.success) return;
  await enregistrerEssai(e.data).catch(() => undefined);
}

export interface HistoriquePassage {
  /** Scores des derniers essais sur ce passage, du plus ancien au plus récent (10 au plus). */
  scores: { score: number; quand: string }[];
  difficiles: MotDifficile[];
}

/** Ce que l'élève a déjà fait sur ce passage, et ses mots difficiles dans la sourate. */
export async function historiquePassage(profil: Profil | null, brut: unknown): Promise<HistoriquePassage> {
  const vide = { scores: [], difficiles: [] };
  if (!profil || !peutOuvrirCoran(profil)) return vide;
  const p = schemaPassage.safeParse(brut);
  if (!p.success) return vide;
  const essais = await listerMesEssais(profil.id, p.data.lecture, p.data.sourate).catch(() => []);
  return {
    scores: essaisDuPassage(essais, p.data.sourate, p.data.du, p.data.au)
      .slice(0, 10)
      .reverse()
      .map((e) => ({ score: e.score, quand: e.quand })),
    difficiles: motsDifficiles(essais, p.data.sourate),
  };
}

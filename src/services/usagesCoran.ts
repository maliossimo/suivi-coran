import "server-only";
import { z } from "zod";
import { ajouterJours } from "@/domain/calendrier";
import { resumerUsagesCoran, type ResumeUsageCoran } from "@/domain/usagesCoran";
import { profilConnecte } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";
import { noterUsageCoran, usagesCoranDepuis } from "@/repositories/usagesCoran";
import { aujourdhuiParis } from "./fiche";

const schema = z.object({
  quoi: z.enum(["lecture", "ecoute", "recitation"]),
  sourate: z.number().int().min(1).max(114),
});

/** Note un usage du Coran de la personne connectée ; ne fait jamais échouer ce qu'elle fait. */
export async function noterUsage(brut: unknown): Promise<void> {
  const u = schema.safeParse(brut);
  if (!u.success) return;
  const profil = await profilConnecte().catch(() => null);
  if (!profil?.actif) return;
  await noterUsageCoran(u.data.quoi, u.data.sourate).catch(() => undefined);
}

/** Administration : qui a lu, écouté ou récité sur les 30 derniers jours (avec le nom des sourates). */
export async function chargerUsagesCoran(): Promise<{ resume: ResumeUsageCoran; noms: Map<number, string> }> {
  const aujourdhui = aujourdhuiParis();
  const [lignes, sourates] = await Promise.all([
    usagesCoranDepuis(ajouterJours(aujourdhui, -29)),
    listerSourates("hafs"),
  ]);
  return {
    resume: resumerUsagesCoran(lignes, aujourdhui),
    noms: new Map(sourates.map((s) => [s.numero, s.nomLatin])),
  };
}

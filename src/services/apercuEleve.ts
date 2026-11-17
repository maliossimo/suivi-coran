import "server-only";
import { z } from "zod";
import { ajouterJours } from "@/domain/calendrier";
import { tendanceEleve, type SemaineTendance, type SensTendance } from "@/domain/tendance";
import { creerReferentiel, libellePassage } from "@/domain/versets";
import { eleveParId, type Profil } from "@/repositories/profils";
import { historiquePourProgression } from "@/repositories/seances";
import { listerSourates } from "@/repositories/sourates";
import { motsARevoirEleve } from "./essais";
import { aujourdhuiParis } from "./fiche";
import { chargerProgression } from "./progression";

export interface ApercuEleve {
  id: string;
  prenom: string;
  nom: string;
  /** Part du Coran apprise (en pages du mushaf), pages et juz complets. */
  pourcentage: number;
  pages: number | null;
  juz: number | null;
  derniere: {
    date: string;
    type: "apprentissage" | "revision";
    dureeMin: number;
    passages: { libelle: string; etat: "valide" | "a_refaire" | "aucun" }[];
  } | null;
  /** Passages « à refaire » des 60 derniers jours (les plus récents d'abord, 5 au plus). */
  aRefaire: string[];
  motsARevoir: number;
  tendance: { semaines: SemaineTendance[]; sens: SensTendance };
}

/**
 * Aperçu rapide d'un élève pour son Cheikh (ou l'admin) : où il en est, sa dernière séance, ce qui est à
 * refaire, et sa tendance sur 8 semaines. Les règles d'accès (RLS) bornent ce qui est lisible.
 */
export async function apercuEleve(acteur: Profil | null, brut: unknown): Promise<ApercuEleve | null> {
  if (!acteur?.actif || (acteur.role !== "maitre" && acteur.role !== "admin")) return null;
  const id = z.string().uuid().safeParse(brut);
  if (!id.success) return null;
  const eleve = await eleveParId(id.data).catch(() => null);
  if (!eleve) return null;
  const aujourdhui = aujourdhuiParis();
  const [seances, progression, aRevoir] = await Promise.all([
    historiquePourProgression(eleve.id, aujourdhui),
    chargerProgression(eleve.id),
    motsARevoirEleve(eleve.id),
  ]);
  const ref = creerReferentiel(await listerSourates(progression.lecture));
  const libelle = (p: Parameters<typeof libellePassage>[1]) => {
    try {
      return libellePassage(ref, p);
    } catch {
      return "Passage";
    }
  };
  const derniere = seances.at(-1);
  const depuis = ajouterJours(aujourdhui, -60);
  const aRefaire = [
    ...new Set(
      seances
        .filter((s) => s.date >= depuis)
        .reverse()
        .flatMap((s) => s.passages.filter((p) => p.corrige && !p.valide).map(libelle)),
    ),
  ].slice(0, 5);
  return {
    id: eleve.id,
    prenom: eleve.prenom,
    nom: eleve.nom,
    pourcentage: progression.pourcentageCoran,
    pages: progression.pagesApprises ?? null,
    juz: progression.juzComplets,
    derniere: derniere
      ? {
          date: derniere.date,
          type: derniere.type,
          dureeMin: derniere.dureeMin,
          passages: derniere.passages.map((p) => ({
            libelle: libelle(p),
            etat: p.valide ? ("valide" as const) : p.corrige ? ("a_refaire" as const) : ("aucun" as const),
          })),
        }
      : null,
    aRefaire,
    motsARevoir: aRevoir.reduce((n, s) => n + s.mots.length, 0),
    tendance: tendanceEleve(ref, seances, aujourdhui),
  };
}

import "server-only";
import { formaterDate, lireDate } from "@/domain/calendrier";
import { carteDuCoran, type CarteDuCoran } from "@/domain/carte";
import { calculerProgression, type Progression } from "@/domain/progression";
import type { Lecture } from "@/domain/lectures";
import { creerReferentiel } from "@/domain/versets";
import { objectifsEntre } from "@/repositories/objectifs";
import { historiquePourProgression } from "@/repositories/seances";
import { lectureEleve } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";
import { aujourdhuiParis } from "./fiche";

/**
 * Progression d'un élève : tout l'historique pour les versets et la carte du Coran,
 * graphiques sur 6 mois et 12 semaines.
 */
export async function chargerProgression(
  eleveId: string,
): Promise<Progression & { aujourdhui: string; lecture: Lecture; carte: CarteDuCoran }> {
  const aujourdhui = aujourdhuiParis();
  const { annee, mois } = lireDate(aujourdhui);
  const index = annee * 12 + (mois - 1) - 5; // 6 mois, le mois courant compris
  const debutObjectifs = formaterDate(Math.floor(index / 12), (index % 12) + 1, 1);

  // Tout l'historique (une sourate apprise il y a longtemps reste connue), en une lecture allégée.
  const [seances, objectifs, lecture] = await Promise.all([
    historiquePourProgression(eleveId, aujourdhui),
    objectifsEntre(eleveId, debutObjectifs, formaterDate(annee, mois, 1)),
    lectureEleve(eleveId),
  ]);

  // Numérotation, hizb et pourcentage dans la lecture de l'élève (Hafs ou Warsh).
  const ref = creerReferentiel(await listerSourates(lecture));
  return {
    ...calculerProgression(ref, seances, objectifs, aujourdhui, { lecture }),
    aujourdhui,
    lecture,
    carte: carteDuCoran(ref, seances, aujourdhui, undefined, lecture),
  };
}

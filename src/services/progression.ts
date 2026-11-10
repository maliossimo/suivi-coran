import "server-only";
import { formaterDate, lireDate } from "@/domain/calendrier";
import { calculerProgression, type Progression } from "@/domain/progression";
import { creerReferentiel } from "@/domain/versets";
import { objectifsEntre } from "@/repositories/objectifs";
import { seancesEntre } from "@/repositories/seances";
import { listerSourates } from "@/repositories/sourates";
import { aujourdhuiParis } from "./fiche";

/** Progression d'un élève sur les 12 derniers mois (graphiques sur 6 mois et 12 semaines). */
export async function chargerProgression(eleveId: string): Promise<Progression & { aujourdhui: string }> {
  const aujourdhui = aujourdhuiParis();
  const { annee, mois } = lireDate(aujourdhui);
  const debut = formaterDate(annee - 1, mois, 1);
  const index = annee * 12 + (mois - 1) - 5; // 6 mois, le mois courant compris
  const debutObjectifs = formaterDate(Math.floor(index / 12), (index % 12) + 1, 1);

  const [apprentissage, revision, objectifs, sourates] = await Promise.all([
    seancesEntre(eleveId, "apprentissage", debut, aujourdhui),
    seancesEntre(eleveId, "revision", debut, aujourdhui),
    objectifsEntre(eleveId, debutObjectifs, formaterDate(annee, mois, 1)),
    listerSourates(),
  ]);

  return {
    ...calculerProgression(
      creerReferentiel(sourates),
      [...apprentissage, ...revision],
      objectifs,
      aujourdhui,
    ),
    aujourdhui,
  };
}

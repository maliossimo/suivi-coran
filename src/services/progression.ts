import "server-only";
import { formaterDate, lireDate } from "@/domain/calendrier";
import { seancesDesAcquis, type Acquis } from "@/domain/acquis";
import { carteDuCoran, type CarteDuCoran } from "@/domain/carte";
import { calculerProgression, type Progression } from "@/domain/progression";
import type { Lecture } from "@/domain/lectures";
import { creerReferentiel, libellePassage } from "@/domain/versets";
import { acquisDe } from "@/repositories/acquis";
import { pagesMushaf } from "@/repositories/coran";
import { objectifsEntre } from "@/repositories/objectifs";
import { historiquePourProgression } from "@/repositories/seances";
import { lectureEleve } from "@/repositories/profils";
import { listerSourates } from "@/repositories/sourates";
import { aujourdhuiParis } from "./fiche";

/**
 * Progression d'un élève : tout l'historique pour les versets et la carte du Coran,
 * graphiques sur 6 mois et 12 semaines.
 */
export async function chargerProgression(eleveId: string): Promise<
  Progression & {
    aujourdhui: string;
    lecture: Lecture;
    carte: CarteDuCoran;
    acquis: (Acquis & { libelle: string })[];
  }
> {
  const aujourdhui = aujourdhuiParis();
  const { annee, mois } = lireDate(aujourdhui);
  const index = annee * 12 + (mois - 1) - 5; // 6 mois, le mois courant compris
  const debutObjectifs = formaterDate(Math.floor(index / 12), (index % 12) + 1, 1);

  // Tout l'historique (une sourate apprise il y a longtemps reste connue), en une lecture allégée.
  const [seances, objectifs, lecture, acquis] = await Promise.all([
    historiquePourProgression(eleveId, aujourdhui),
    objectifsEntre(eleveId, debutObjectifs, formaterDate(annee, mois, 1)),
    lectureEleve(eleveId),
    acquisDe(eleveId),
  ]);

  // Numérotation, hizb, pages et pourcentage dans la lecture de l'élève (Hafs ou Warsh).
  const [sourates, pages] = await Promise.all([listerSourates(lecture), pagesMushaf(lecture)]);
  const ref = creerReferentiel(sourates);
  // « Ce que je connais déjà » compte comme appris (et révisé le jour de la déclaration), sans temps de travail.
  const declares = seancesDesAcquis(acquis, jourParis);
  return {
    ...calculerProgression(ref, seances, objectifs, aujourdhui, { lecture, pages, acquis: declares }),
    aujourdhui,
    lecture,
    carte: carteDuCoran(ref, [...seances, ...declares], aujourdhui, undefined, lecture),
    acquis: acquis.map((a) => ({ ...a, libelle: libellePassage(ref, a.passage) })),
  };
}

/** Jour (à Paris) d'un horodatage. */
function jourParis(horodatage: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(horodatage));
}

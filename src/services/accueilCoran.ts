import "server-only";
import { ajouterJours } from "@/domain/calendrier";
import { essaisDuPassage, motsDifficiles, type MotDifficile } from "@/domain/essais";
import type { Lecture } from "@/domain/lectures";
import { creerReferentiel, libellePassage, type Passage } from "@/domain/versets";
import { listerMesEssais } from "@/repositories/essais";
import type { Profil } from "@/repositories/profils";
import { derniereSeanceAvecPassagesAvant } from "@/repositories/seances";
import { listerSourates } from "@/repositories/sourates";
import { aujourdhuiParis } from "@/services/fiche";

export interface PassageAReciter {
  sourate: number;
  du: number;
  au: number;
  libelle: string;
  /** Apprentissage ou révision : d'où vient ce passage. */
  type: "apprentissage" | "revision";
  /** Date de la séance (AAAA-MM-JJ). */
  date: string;
  /** Scores des derniers essais sur ce passage, du plus ancien au plus récent. */
  scores: number[];
  difficiles: MotDifficile[];
}

export interface AccueilCoran {
  lecture: Lecture;
  /** Le passage de la dernière séance (aujourd'hui compris), sinon null. */
  passage: PassageAReciter | null;
}

/** Une sourate à la fois : le passage s'arrête à la fin de sa première sourate. */
function bornes(p: Passage, nbVersets: (s: number) => number): { sourate: number; du: number; au: number } {
  return {
    sourate: p.sourateDebut,
    du: p.versetDebut,
    au: p.sourateFin === p.sourateDebut ? p.versetFin : nbVersets(p.sourateDebut),
  };
}

/** Accueil « Coran » de l'élève : le passage du jour à réciter, ses derniers scores, ses mots difficiles. */
export async function chargerAccueilCoran(profil: Profil): Promise<AccueilCoran> {
  const lecture: Lecture = profil.lecture ?? "hafs";
  const demain = ajouterJours(aujourdhuiParis(), 1);
  const [sourates, appr, rev] = await Promise.all([
    listerSourates(lecture),
    derniereSeanceAvecPassagesAvant(profil.id, "apprentissage", demain).catch(() => null),
    derniereSeanceAvecPassagesAvant(profil.id, "revision", demain).catch(() => null),
  ]);
  // La plus récente des deux ; à égalité, l'apprentissage (le passage nouveau).
  const seance = !appr ? rev : !rev ? appr : rev.date > appr.date ? rev : appr;
  const p = seance?.passages.at(-1);
  if (!seance || !p) return { lecture, passage: null };

  const ref = creerReferentiel(sourates);
  const b = bornes(p, (s) => ref.get(s)?.nbVersets ?? p.versetDebut);
  const essais = await listerMesEssais(profil.id, lecture, b.sourate).catch(() => []);
  return {
    lecture,
    passage: {
      ...b,
      libelle: libellePassage(ref, p),
      type: seance.type,
      date: seance.date,
      scores: essaisDuPassage(essais, b.sourate, b.du, b.au)
        .slice(0, 5)
        .reverse()
        .map((e) => e.score),
      difficiles: motsDifficiles(essais, b.sourate, 5),
    },
  };
}

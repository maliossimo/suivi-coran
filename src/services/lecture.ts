import "server-only";
import { z } from "zod";
import { LECTURES, type Lecture } from "@/domain/lectures";
import { changerLecture, eleveParId, type Profil } from "@/repositories/profils";
import type { ResultatSaisie } from "./fiche";

const schema = z.object({
  eleveId: z.string().uuid(),
  lecture: z.enum(LECTURES as [Lecture, ...Lecture[]]),
});

/**
 * L'élève choisit sa lecture (à la première connexion, ou pour corriger une erreur),
 * ou son Cheikh / l'admin la change pour lui. Les droits sont vérifiés par la base ;
 * ici on refuse seulement tout de suite le cas évident d'un élève qui viserait un autre.
 */
export async function choisirLecture(
  acteur: Profil,
  brut: { eleveId: unknown; lecture: unknown },
): Promise<ResultatSaisie> {
  const saisie = schema.safeParse(brut);
  if (!saisie.success) return { ok: false, erreur: "Choisis Hafs ou Warsh." };
  if (acteur.role === "eleve" && saisie.data.eleveId !== acteur.id) {
    return { ok: false, erreur: "Tu ne peux changer que ta propre lecture." };
  }
  try {
    await changerLecture(saisie.data.eleveId, saisie.data.lecture);
  } catch {
    return { ok: false, erreur: "Le changement n’a pas pu être enregistré. Réessaie dans un instant." };
  }
  return { ok: true };
}

/** Élève dont on change la lecture (lui-même, ou un élève visible par le Cheikh). */
export async function eleveDeLaLecture(acteur: Profil, eleveId?: string) {
  if (!eleveId) {
    return acteur.role === "eleve"
      ? { id: acteur.id, prenom: acteur.prenom, nom: acteur.nom, lecture: acteur.lecture }
      : null;
  }
  return z.string().uuid().safeParse(eleveId).success ? eleveParId(eleveId) : null;
}

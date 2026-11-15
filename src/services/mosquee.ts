import "server-only";
import { redirect } from "next/navigation";
import { listerEtablissements } from "@/repositories/admin";
import { listerClasses, membresClasse, personnesEtablissement } from "@/repositories/presences";
import type { Profil } from "@/repositories/profils";
import { exigerEspace } from "@/services/acces";

export interface MaMosquee {
  id: string;
  nom: string;
  classes: { id: string; nom: string; cheikhs: string[]; eleves: number }[];
  cheikhs: { id: string; nom: string }[];
  eleves: number;
  /** Élèves qui ne sont dans aucune classe en cours. */
  sansClasse: number;
}

/** Le responsable de sa mosquée (Cheikh nommé par l'admin) ; les autres retournent à leur accueil. */
export async function exigerResponsable(): Promise<Profil> {
  const profil = await exigerEspace("maitre");
  if (profil.role !== "maitre" || !profil.responsable || !profil.etablissementId) redirect("/maitre");
  return profil;
}

/** Tableau de « Ma mosquée » : classes, Cheikhs, élèves (la base limite tout à sa mosquée). */
export async function chargerMaMosquee(profil: Profil): Promise<MaMosquee> {
  const id = profil.etablissementId!;
  const [etablissements, classes, personnes] = await Promise.all([
    listerEtablissements(),
    listerClasses(),
    personnesEtablissement(id),
  ]);
  const enCours = classes.filter((c) => !c.archivee && c.etablissementId === id);
  const membres = await Promise.all(enCours.map((c) => membresClasse(c.id)));
  const places = new Set(
    membres
      .flat()
      .filter((m) => m.actif && m.eleveId)
      .map((m) => m.eleveId!),
  );
  return {
    id,
    nom: etablissements.find((e) => e.id === id)?.nom ?? "Ma mosquée",
    classes: enCours.map((c, i) => ({
      id: c.id,
      nom: c.nom,
      cheikhs: c.cheikhs.map((ch) => ch.nom),
      eleves: (membres[i] ?? []).filter((m) => m.actif).length,
    })),
    cheikhs: personnes.maitres,
    eleves: personnes.eleves.length,
    sansClasse: personnes.eleves.filter((e) => !places.has(e.id)).length,
  };
}

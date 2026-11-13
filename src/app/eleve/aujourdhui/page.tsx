import { redirect } from "next/navigation";
import { aujourdhuiParis } from "@/services/fiche";
import { exigerEleveAvecLecture } from "@/services/acces";

/** Raccourci de l'icône « Saisir ma séance du jour » : ouvre la séance d'apprentissage du jour. */
export default async function SeanceDuJour() {
  await exigerEleveAvecLecture();
  redirect(`/eleve/seance?date=${aujourdhuiParis()}&type=apprentissage`);
}

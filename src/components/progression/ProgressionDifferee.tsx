import { chargerProgression } from "@/services/progression";
import { EcranProgression } from "./EcranProgression";

/** Calcule la progression (12 mois de séances) pendant que le haut de la page est déjà affiché. */
export async function ProgressionDifferee({ eleveId, base }: { eleveId: string; base: string }) {
  const progression = await chargerProgression(eleveId);
  return <EcranProgression p={progression} base={base} />;
}

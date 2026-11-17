import { chargerProgression } from "@/services/progression";
import { motsARevoirEleve } from "@/services/essais";
import { EcranProgression } from "./EcranProgression";
import { MotsARevoir } from "./MotsARevoir";

/** Calcule la progression (12 mois de séances) pendant que le haut de la page est déjà affiché. */
export async function ProgressionDifferee({ eleveId, base }: { eleveId: string; base: string }) {
  const [progression, aRevoir] = await Promise.all([chargerProgression(eleveId), motsARevoirEleve(eleveId)]);
  return (
    <>
      <EcranProgression p={progression} base={base} />
      {/* L'élève ouvre la sourate (Réciter y propose ses mots) ; le Cheikh voit seulement la liste. */}
      <MotsARevoir liste={aRevoir} lienCoran={base === "/eleve" ? "/eleve/coran/lire" : null} />
    </>
  );
}

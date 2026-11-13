import { redirect } from "next/navigation";
import { CadreAuth } from "@/components/CadreAuth";
import { etatVerification } from "@/services/codeAdmin";
import { FormulaireCode } from "./FormulaireCode";

export const metadata = { title: "Code de vérification" };

export default async function PageVerification() {
  const etat = await etatVerification();
  if ("aller" in etat) redirect(etat.aller);

  return (
    <CadreAuth
      titre="Vérification"
      sousTitre="Pour protéger l’administration, un code est demandé une fois sur chaque appareil."
    >
      <FormulaireCode email={etat.email} />
    </CadreAuth>
  );
}

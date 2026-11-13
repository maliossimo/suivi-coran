import { redirect } from "next/navigation";
import { CadreAuth } from "@/components/CadreAuth";
import { destinationVerification } from "@/services/securite";
import { FormulaireCode } from "./FormulaireCode";

export const metadata = { title: "Code de vérification" };

export default async function PageVerification() {
  const destination = await destinationVerification();
  if (destination) redirect(destination);

  return (
    <CadreAuth
      titre="Code de vérification"
      sousTitre="Ouvre ton appli d’authentification et saisis le code à 6 chiffres."
    >
      <FormulaireCode />
    </CadreAuth>
  );
}

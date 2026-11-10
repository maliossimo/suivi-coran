import { CadreAuth } from "@/components/CadreAuth";
import { FormulaireConnexion } from "./FormulaireConnexion";

const MESSAGES: Record<string, string> = {
  inactif: "Ce compte est désactivé. Contacte ton maître.",
  lien: "Ce lien n'est plus valide. Demande une nouvelle invitation ou un nouveau lien.",
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <CadreAuth titre="Connexion" sousTitre="Retrouve ton suivi d'apprentissage et de révision.">
      <FormulaireConnexion erreurInitiale={erreur ? MESSAGES[erreur] : undefined} />
    </CadreAuth>
  );
}

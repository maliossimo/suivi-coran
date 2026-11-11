import { chargerFiche } from "@/services/fiche";
import { FicheMois } from "./FicheMois";

/** Charge la fiche du mois pendant que l'en-tête de la page est déjà affiché. */
export async function FicheDifferee({
  eleveId,
  base,
  mois,
  type,
  vueMaitre = false,
}: {
  eleveId: string;
  base: string;
  mois?: string;
  type?: string;
  vueMaitre?: boolean;
}) {
  const fiche = await chargerFiche(eleveId, mois, type);
  return <FicheMois fiche={fiche} eleveId={eleveId} base={base} vueMaitre={vueMaitre} />;
}

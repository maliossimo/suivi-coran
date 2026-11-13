import { DETAIL_ETAT_CHEIKH, LIBELLE_ETAT_CHEIKH, type EtatCheikh } from "@/domain/fiche";

/**
 * Où en est un passage ou une séance chez le Cheikh. Mêmes couleurs dans toute l'appli :
 * gris = à écouter, vert = écouté, or = validé (le mot reste toujours écrit).
 */
export function PastilleCheikh({ etat }: { etat: EtatCheikh | null }) {
  if (!etat) return null;
  const classe = etat === "partielle" ? "etat-a-ecouter" : `etat-${etat}`;
  return (
    <span className={`pastille-etat ${classe}`} title={DETAIL_ETAT_CHEIKH[etat]}>
      {LIBELLE_ETAT_CHEIKH[etat]}
    </span>
  );
}

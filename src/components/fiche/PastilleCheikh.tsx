import { LIBELLE_ETAT_CHEIKH, type EtatCheikh } from "@/domain/fiche";

/** Où en est la séance chez le Cheikh : écoutée, validée, ou un ajout encore à écouter. */
export function PastilleCheikh({ etat, court = false }: { etat: EtatCheikh | null; court?: boolean }) {
  if (!etat) return null;
  if (etat === "partielle") {
    return (
      <span className="pastille-or pastille-partielle">
        {court ? "Ajout à écouter" : "Un ajout n’a pas encore été écouté par le Cheikh"}
      </span>
    );
  }
  return (
    <span className={etat === "valide" ? "pastille-or" : "pastille-ecoute"}>
      {court ? (etat === "valide" ? "✓ Validé" : "🎧 Écouté") : LIBELLE_ETAT_CHEIKH[etat]}
    </span>
  );
}

import type { Mois, TypeSeance } from "@/domain/fiche";
import { premierJour } from "@/domain/fiche";
import { chargerBilan } from "@/services/fiche";
import { FormulaireBilan } from "./FormulaireBilan";
import { FormulaireCommentaire } from "./FormulaireCommentaire";

function formaterDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

/** Bilan du mois, chargé après le reste de la fiche (affiché en différé). */
export async function SectionBilan({
  eleveId,
  type,
  mois,
  vueMaitre,
}: {
  eleveId: string;
  type: TypeSeance;
  mois: Mois;
  vueMaitre: boolean;
}) {
  const { bilan, commentaires } = await chargerBilan(eleveId, type, mois);
  return (
    <>
      {bilan?.corrige ? <span className="pastille-or bilan-pastille">Complété par le Cheikh</span> : null}
      <FormulaireBilan
        eleveId={eleveId}
        type={type}
        mois={premierJour(mois)}
        bilan={bilan}
        vueMaitre={vueMaitre}
      />
      {commentaires.length > 0 ? (
        <div className="commentaire-maitre">
          <h4>Mot du Cheikh</h4>
          {commentaires.map((c) => (
            <p key={c.creeLe}>
              {c.texte}
              <small> · {formaterDateHeure(c.creeLe)}</small>
            </p>
          ))}
        </div>
      ) : null}
      {vueMaitre && bilan ? (
        <FormulaireCommentaire eleveId={eleveId} cible="bilan" cibleId={bilan.id} />
      ) : null}
    </>
  );
}

import { ChevronLeft, Ellipsis } from "lucide-react";
import Link from "next/link";
import { positionSurFiche, type DateISO } from "@/domain/calendrier";
import { libelleJourCourt, LIBELLE_TYPE, type TypeSeance } from "@/domain/fiche";
import type { DonneesSeance } from "@/services/fiche";
import { BoutonSupprimerSeance } from "./BoutonSupprimerSeance";
import { EcouteCheikh } from "./EcouteCheikh";
import { FormulaireCommentaire } from "./FormulaireCommentaire";
import { FormulaireSeance } from "./FormulaireSeance";

function formaterDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

/**
 * Écran d'une séance, commun à l'élève et au Cheikh.
 * Élève : la saisie. Cheikh : la récitation et le commentaire d'abord,
 * la saisie de l'élève résumée (modifiable d'un toucher).
 */
export function EcranSeance({
  donnees,
  eleveId,
  base,
  date,
  type,
  vueMaitre,
}: {
  donnees: DonneesSeance;
  eleveId: string;
  base: string;
  date: DateISO;
  type: TypeSeance;
  vueMaitre: boolean;
}) {
  const { jour } = positionSurFiche(date);
  const retour = `${base}?mois=${date.slice(0, 7)}&type=${type}`;

  const commentaires =
    donnees.commentaires.length > 0 ? (
      <section className="commentaire-maitre">
        <h2>{vueMaitre ? "Tes commentaires" : "Ton Cheikh"}</h2>
        {donnees.commentaires.map((c) => (
          <p key={c.creeLe}>
            {c.texte}
            <small> · {formaterDateHeure(c.creeLe)}</small>
          </p>
        ))}
      </section>
    ) : null;

  return (
    <>
      <header className="seance-barre">
        <Link href={retour} className="seance-retour" aria-label="Retour à la fiche">
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <h1>
          {LIBELLE_TYPE[type]}{" "}
          <span>
            · Jour {jour} · {libelleJourCourt(date)}
          </span>
        </h1>
        {donnees.seance ? (
          <details className="menu-plus seance-menu">
            <summary aria-label="Plus d’actions">
              <Ellipsis size={20} aria-hidden="true" />
            </summary>
            <div className="menu-plus-liste">
              <BoutonSupprimerSeance
                eleveId={eleveId}
                date={date}
                type={type}
                retour={retour}
                libelleJour={libelleJourCourt(date)}
              />
            </div>
          </details>
        ) : null}
      </header>

      {vueMaitre && donnees.seance ? (
        <>
          <EcouteCheikh
            // Remonté si les passages changent (nouvel enregistrement).
            key={donnees.seance.passages
              .map((p) => `${p.sourateDebut}:${p.versetDebut}-${p.versetFin}`)
              .join()}
            eleveId={eleveId}
            seanceId={donnees.seance.id}
            passages={donnees.seance.passages}
            sourates={donnees.sourates}
          />
          {commentaires}
          <FormulaireCommentaire eleveId={eleveId} cible="seance" cibleId={donnees.seance.id} />
        </>
      ) : null}

      <FormulaireSeance
        eleveId={eleveId}
        retour={retour}
        date={date}
        type={type}
        initiale={donnees.seance}
        suggestion={donnees.suggestion}
        propose={donnees.propose}
        vueMaitre={vueMaitre}
        // Côté Cheikh, la saisie de l'élève est résumée : on ne la modifie que si besoin.
        replie={vueMaitre && donnees.seance !== null}
        libelleBouton={vueMaitre ? "Enregistrer la correction" : "Enregistrer"}
        apresPassages={vueMaitre ? null : commentaires}
        sourates={donnees.sourates.map((s) => ({
          numero: s.numero,
          nomLatin: s.nomLatin,
          nomAr: s.nomAr,
          nbVersets: s.nbVersets,
        }))}
      />
    </>
  );
}

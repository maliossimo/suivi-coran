import Link from "next/link";
import { actionSupprimerSeance } from "@/app/actions/fiche";
import { positionSurFiche, type DateISO } from "@/domain/calendrier";
import { libelleJourCourt, LIBELLE_TYPE, type TypeSeance } from "@/domain/fiche";
import type { DonneesSeance } from "@/services/fiche";
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

/** Écran d'une séance (saisie ou correction), commun à l'élève et au maître. */
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
  const { semaine, jour } = positionSurFiche(date);
  const retour = `${base}?mois=${date.slice(0, 7)}&type=${type}`;

  return (
    <>
      <Link href={retour} className="lien-retour">
        ‹ Retour à la fiche
      </Link>
      <header className="seance-entete">
        <h1>
          {LIBELLE_TYPE[type]} · Jour {jour}
        </h1>
        <p>
          Semaine {semaine} · {libelleJourCourt(date)}
          {donnees.seance?.corrigee ? <span className="pastille-or">Corrigée par le maître</span> : null}
        </p>
      </header>

      {donnees.commentaires.length > 0 ? (
        <section className="commentaire-maitre">
          <h2>Commentaire{donnees.commentaires.length > 1 ? "s" : ""} du maître</h2>
          {donnees.commentaires.map((c) => (
            <p key={c.creeLe}>
              {c.texte}
              <small> · {formaterDateHeure(c.creeLe)}</small>
            </p>
          ))}
        </section>
      ) : null}

      {vueMaitre && donnees.seance ? (
        <FormulaireCommentaire eleveId={eleveId} cible="seance" cibleId={donnees.seance.id} />
      ) : null}

      <FormulaireSeance
        eleveId={eleveId}
        retour={retour}
        date={date}
        type={type}
        initiale={donnees.seance}
        suggestion={donnees.suggestion}
        vueMaitre={vueMaitre}
        libelleBouton={vueMaitre ? "Enregistrer la correction" : "Enregistrer la séance"}
        sourates={donnees.sourates.map((s) => ({
          numero: s.numero,
          nomLatin: s.nomLatin,
          nomAr: s.nomAr,
          nbVersets: s.nbVersets,
        }))}
      />

      {donnees.seance ? (
        <form action={actionSupprimerSeance} className="zone-suppression">
          <input type="hidden" name="eleveId" value={eleveId} />
          <input type="hidden" name="retour" value={retour} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="type" value={type} />
          <button type="submit" className="bouton-danger">
            Supprimer cette séance
          </button>
        </form>
      ) : null}
    </>
  );
}

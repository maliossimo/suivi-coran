import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { positionSurFiche, type DateISO } from "@/domain/calendrier";
import { etatCorrection, libelleJourCourt, LIBELLE_TYPE, type TypeSeance } from "@/domain/fiche";
import type { DonneesSeance } from "@/services/fiche";
import { BoutonSupprimerSeance } from "./BoutonSupprimerSeance";
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
        <ChevronLeft size={18} aria-hidden="true" />
        Retour à la fiche
      </Link>
      <header className="seance-entete">
        <h1>
          {LIBELLE_TYPE[type]} · Jour {jour}
        </h1>
        <p>
          Semaine {semaine} · {libelleJourCourt(date)}
          {donnees.seance && etatCorrection(donnees.seance) === "complete" ? (
            <span className="pastille-or">Corrigée par le Cheikh</span>
          ) : null}
          {donnees.seance && etatCorrection(donnees.seance) === "partielle" ? (
            <span className="pastille-or pastille-partielle">Corrigée en partie par le Cheikh</span>
          ) : null}
        </p>
      </header>

      {donnees.commentaires.length > 0 ? (
        <section className="commentaire-maitre">
          <h2>Commentaire{donnees.commentaires.length > 1 ? "s" : ""} du Cheikh</h2>
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
        propose={donnees.propose}
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
        <BoutonSupprimerSeance
          eleveId={eleveId}
          date={date}
          type={type}
          retour={retour}
          libelleJour={libelleJourCourt(date)}
        />
      ) : null}
    </>
  );
}

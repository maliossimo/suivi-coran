import Link from "next/link";
import { redirect } from "next/navigation";
import { positionSurFiche } from "@/domain/calendrier";
import { libelleJourCourt, LIBELLE_TYPE } from "@/domain/fiche";
import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";
import { chargerSeance, lireDateSaisissable, lireType } from "@/services/fiche";
import { actionSupprimerSeance } from "../actions";
import { FormulaireSeance } from "./FormulaireSeance";

export default async function PageSeance({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string }>;
}) {
  const profil = await exigerEspace("eleve");
  const params = await searchParams;
  const date = lireDateSaisissable(params.date);
  const type = lireType(params.type);
  if (!date) redirect(`/eleve?type=${type}`);

  const donnees = await chargerSeance(profil.id, date, type);
  const { semaine, jour } = positionSurFiche(date);
  const retour = `/eleve?mois=${date.slice(0, 7)}&type=${type}`;

  return (
    <>
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} role="Élève" />
      <main className="espace espace-etroit">
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
            <h2>Commentaire du maître</h2>
            {donnees.commentaires.map((c) => (
              <p key={c.creeLe}>{c.texte}</p>
            ))}
          </section>
        ) : null}

        <FormulaireSeance
          date={date}
          type={type}
          initiale={donnees.seance}
          sourates={donnees.sourates.map((s) => ({
            numero: s.numero,
            nomLatin: s.nomLatin,
            nomAr: s.nomAr,
            nbVersets: s.nbVersets,
          }))}
        />

        {donnees.seance ? (
          <form action={actionSupprimerSeance} className="zone-suppression">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="type" value={type} />
            <button type="submit" className="bouton-danger">
              Supprimer cette séance
            </button>
          </form>
        ) : null}
      </main>
    </>
  );
}

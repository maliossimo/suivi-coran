import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EnvoiAppels } from "@/components/presences/EnvoiAppels";
import { FeuilleAppel } from "@/components/presences/FeuilleAppel";
import { libelleDateLongue, libelleJourSemaine } from "@/domain/fiche";
import { chargerAppel, exigerPresences } from "@/services/presences";

export const metadata = { title: "Appel" };

export default async function PageAppel({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const profil = await exigerPresences();
  const dateDemandee = (await searchParams).date;
  const a = await chargerAppel(profil, (await params).id, dateDemandee);
  if (!a) notFound();
  const retour = `/presences/${a.classe.id}`;

  return (
    <>
      <EnteteEspace titre="Appel" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <EnvoiAppels />
        <Link href={retour} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          {a.classe.nom}
        </Link>
        <header className="entete-appel">
          <h1>
            {a.classe.nom} · {libelleJourSemaine(a.date)} {libelleDateLongue(a.date)}
          </h1>
          <form method="get" className="choix-date-appel">
            <label htmlFor="date">Autre jour</label>
            <input id="date" name="date" type="date" defaultValue={a.date} max={a.aujourdhui} />
            <button type="submit" className="bouton-secondaire">
              Ouvrir
            </button>
          </form>
          {!a.coursCeJour ? (
            <p className="message-info">Ce n’est pas un jour de cours habituel de cette classe.</p>
          ) : null}
          {a.faitLe ? <p className="carte-graphique-sous">Appel déjà fait : tu peux le corriger.</p> : null}
        </header>
        {a.peutAppel ? (
          <FeuilleAppel
            classeId={a.classe.id}
            date={a.date}
            dateFixe={Boolean(dateDemandee)}
            membres={a.membres}
            deja={a.deja}
            retour={retour}
          />
        ) : (
          <p className="message-info">Seul le Cheikh de la classe fait l’appel.</p>
        )}
      </main>
    </>
  );
}

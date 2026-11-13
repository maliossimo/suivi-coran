import { redirect } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EcouterPassages } from "@/components/coran/EcouterPassages";
import { EcranSeance } from "@/components/fiche/EcranSeance";
import { exigerEleveAvecLecture } from "@/services/acces";
import { peutOuvrirCoran } from "@/services/coran";
import { chargerSeance, lireDateSaisissable, lireType } from "@/services/fiche";

export default async function PageSeance({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string; passage?: string }>;
}) {
  const profil = await exigerEleveAvecLecture();
  const params = await searchParams;
  const date = lireDateSaisissable(params.date);
  const type = lireType(params.type);
  if (!date) redirect(`/eleve?type=${type}`);

  const donnees = await chargerSeance(profil.id, date, type, params.passage);

  return (
    <>
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        {/* Pour l'élève seulement : la vue du Cheikh reste centrée sur la correction. */}
        {peutOuvrirCoran(profil) && donnees.seance ? (
          <EcouterPassages
            passages={donnees.seance.passages}
            sourates={donnees.sourates}
            lecture={donnees.lecture}
          />
        ) : null}
        <EcranSeance
          donnees={donnees}
          eleveId={profil.id}
          base="/eleve"
          date={date}
          type={type}
          vueMaitre={false}
        />
      </main>
    </>
  );
}

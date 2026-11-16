import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { FicheDifferee } from "@/components/fiche/FicheDifferee";
import { redirect } from "next/navigation";
import { exigerEleveAvecLecture } from "@/services/acces";
import { doitDeclarerAcquis } from "@/services/acquis";

export default async function PageFiche({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; type?: string }>;
}) {
  const [profil, params] = await Promise.all([exigerEleveAvecLecture(), searchParams]);
  // Nouvel élève, ou inscrit avant la fonctionnalité : « Ce que tu connais déjà », une seule fois.
  if (await doitDeclarerAcquis(profil)) redirect("/eleve/acquis?arrivee=1");

  return (
    <>
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        {/* Pas de clé : en changeant de mois ou d’onglet, la fiche reste affichée jusqu’à l’arrivée de la suivante. */}
        <Suspense fallback={<Squelettes />}>
          <FicheDifferee eleveId={profil.id} base="/eleve" mois={params.mois} type={params.type} />
        </Suspense>
      </main>
    </>
  );
}

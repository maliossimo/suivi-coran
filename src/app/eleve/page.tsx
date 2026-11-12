import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { FicheDifferee } from "@/components/fiche/FicheDifferee";
import { exigerEspace } from "@/services/acces";

export default async function PageFiche({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; type?: string }>;
}) {
  const profil = await exigerEspace("eleve");
  const params = await searchParams;

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

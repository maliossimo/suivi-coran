import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { ProgressionDifferee } from "@/components/progression/ProgressionDifferee";
import { exigerEspace } from "@/services/acces";

export default async function PageProgressionEleve() {
  const profil = await exigerEspace("eleve");

  return (
    <>
      <EnteteEspace titre="Ma progression" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        <Suspense fallback={<Squelettes cartes={4} />}>
          <ProgressionDifferee eleveId={profil.id} base="/eleve" />
        </Suspense>
      </main>
    </>
  );
}

import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { ProgressionDifferee } from "@/components/progression/ProgressionDifferee";
import { exigerEspace } from "@/services/acces";

export default async function PageProgressionEleve() {
  const profil = await exigerEspace("eleve");

  return (
    <>
      <EnteteEspace titre="Ma progression" nom={`${profil.prenom} ${profil.nom}`.trim()} role="Élève" />
      <main className="espace">
        <nav className="sous-menu" aria-label="Mon espace">
          <Link href="/eleve">Ma fiche</Link>
          <Link href="/eleve/progression" aria-current="page">
            Ma progression
          </Link>
        </nav>
        <Suspense fallback={<Squelettes cartes={4} />}>
          <ProgressionDifferee eleveId={profil.id} />
        </Suspense>
      </main>
    </>
  );
}

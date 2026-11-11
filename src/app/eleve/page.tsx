import Link from "next/link";
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
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} role="Élève" />
      <main className="espace">
        <nav className="sous-menu" aria-label="Mon espace">
          <Link href="/eleve" aria-current="page">
            Ma fiche
          </Link>
          <Link href="/eleve/progression">Ma progression</Link>
        </nav>
        <Suspense key={`${params.mois}-${params.type}`} fallback={<Squelettes />}>
          <FicheDifferee eleveId={profil.id} base="/eleve" mois={params.mois} type={params.type} />
        </Suspense>
      </main>
    </>
  );
}

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { ProgressionDifferee } from "@/components/progression/ProgressionDifferee";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";

export default async function PageProgressionMaitre({ params }: { params: Promise<{ id: string }> }) {
  const profil = await exigerEspace("maitre");
  const { id } = await params;
  const eleve = /^[0-9a-f-]{36}$/i.test(id) ? await chargerEleve(id) : null;
  if (!eleve) notFound();

  return (
    <>
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        <Link href={`/maitre/eleves/${eleve.id}`} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Fiche de {eleve.prenom}
        </Link>
        <h1 className="titre-page">
          Progression de {eleve.prenom} {eleve.nom}
        </h1>
        <Suspense fallback={<Squelettes cartes={4} />}>
          <ProgressionDifferee eleveId={eleve.id} base={`/maitre/eleves/${eleve.id}`} />
        </Suspense>
      </main>
    </>
  );
}

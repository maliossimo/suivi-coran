import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FicheMois } from "@/components/fiche/FicheMois";
import { exigerEspace } from "@/services/acces";
import { chargerFiche } from "@/services/fiche";

export default async function PageFiche({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; type?: string }>;
}) {
  const profil = await exigerEspace("eleve");
  const params = await searchParams;
  const fiche = await chargerFiche(profil.id, params.mois, params.type);

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
        <FicheMois fiche={fiche} eleveId={profil.id} base="/eleve" />
      </main>
    </>
  );
}

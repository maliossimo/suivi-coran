import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EcranProgression } from "@/components/progression/EcranProgression";
import { exigerEspace } from "@/services/acces";
import { chargerProgression } from "@/services/progression";

export default async function PageProgressionEleve() {
  const profil = await exigerEspace("eleve");
  const progression = await chargerProgression(profil.id);

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
        <EcranProgression p={progression} />
      </main>
    </>
  );
}

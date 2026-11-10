import Link from "next/link";
import { notFound } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EcranProgression } from "@/components/progression/EcranProgression";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";
import { chargerProgression } from "@/services/progression";

export default async function PageProgressionMaitre({ params }: { params: Promise<{ id: string }> }) {
  const profil = await exigerEspace("maitre");
  const { id } = await params;
  const eleve = /^[0-9a-f-]{36}$/i.test(id) ? await chargerEleve(id) : null;
  if (!eleve) notFound();
  const progression = await chargerProgression(eleve.id);

  return (
    <>
      <EnteteEspace
        titre="Ma classe"
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role === "admin" ? "Administrateur" : "Maître"}
      />
      <main className="espace">
        <Link href={`/maitre/eleves/${eleve.id}`} className="lien-retour">
          ‹ Fiche de {eleve.prenom}
        </Link>
        <h1 className="titre-page">
          Progression de {eleve.prenom} {eleve.nom}
        </h1>
        <EcranProgression p={progression} />
      </main>
    </>
  );
}

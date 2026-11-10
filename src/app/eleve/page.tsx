import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

export default async function Page() {
  const profil = await exigerEspace("eleve");

  return (
    <main className="espace">
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} />
      <p>La fiche du mois (apprentissage et révision) arrive dans la prochaine PR.</p>
    </main>
  );
}

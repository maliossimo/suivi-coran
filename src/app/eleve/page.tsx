import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

export default async function Page() {
  const profil = await exigerEspace("eleve");
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <>
      <EnteteEspace titre="Ma fiche" nom={nom} role="Élève" />
      <main className="espace">
        <section className="carte-accueil">
          <h2>Assalamu alaykum{profil.prenom ? ` ${profil.prenom}` : ""}</h2>
          <p>La fiche du mois (apprentissage et révision) arrive très bientôt.</p>
        </section>
      </main>
    </>
  );
}

import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

export default async function Page() {
  const profil = await exigerEspace("maitre");
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <>
      <EnteteEspace titre="Ma classe" nom={nom} role="Maître" />
      <main className="espace">
        <section className="carte-accueil">
          <h2>Assalamu alaykum{profil.prenom ? ` ${profil.prenom}` : ""}</h2>
          <p>Le tableau de bord de la classe arrive dans une prochaine version.</p>
        </section>
      </main>
    </>
  );
}

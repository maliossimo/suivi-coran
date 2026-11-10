import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

export default async function Page() {
  const profil = await exigerEspace("admin");
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <>
      <EnteteEspace titre="Administration" nom={nom} role="Administrateur" />
      <main className="espace">
        <section className="carte-accueil">
          <h2>Assalamu alaykum{profil.prenom ? ` ${profil.prenom}` : ""}</h2>
          <p>Le back-office (utilisateurs, usage, journal d’audit) arrive dans une prochaine version.</p>
        </section>
      </main>
    </>
  );
}

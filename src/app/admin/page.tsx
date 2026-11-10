import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

export default async function Page() {
  const profil = await exigerEspace("admin");

  return (
    <main className="espace">
      <EnteteEspace titre="Administration" nom={`${profil.prenom} ${profil.nom}`.trim()} />
      <p>Le back-office (utilisateurs, usage, journal d’audit) arrive dans une prochaine PR.</p>
    </main>
  );
}

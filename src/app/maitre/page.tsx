import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

export default async function Page() {
  const profil = await exigerEspace("maitre");

  return (
    <main className="espace">
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} />
      <p>Le tableau de bord de la classe arrive dans une prochaine PR.</p>
    </main>
  );
}

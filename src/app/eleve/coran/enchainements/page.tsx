import { EnteteEspace } from "@/components/EnteteEspace";
import { TestEnchainements } from "@/components/coran/TestEnchainements";
import { exigerEleveAvecLecture } from "@/services/acces";
import { chargerEnchainements } from "@/services/enchainements";

export const metadata = { title: "Tester les enchaînements" };

export default async function PageEnchainements() {
  const profil = await exigerEleveAvecLecture();
  const donnees = await chargerEnchainements(profil);
  return (
    <>
      <EnteteEspace titre="Enchaînements" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <TestEnchainements {...donnees} />
      </main>
    </>
  );
}

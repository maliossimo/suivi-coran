import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireInvitation } from "@/components/FormulaireInvitation";
import { exigerEspace } from "@/services/acces";

export default async function PageInviter() {
  const profil = await exigerEspace("maitre");

  return (
    <>
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} role="Maître" />
      <main className="espace espace-etroit">
        <Link href="/maitre" className="lien-retour">
          ‹ Toute la classe
        </Link>
        <header className="seance-entete">
          <h1>Inviter un élève</h1>
          <p>L’élève reçoit un e-mail avec un lien pour choisir son mot de passe.</p>
        </header>
        <FormulaireInvitation cible="eleve" />
      </main>
    </>
  );
}

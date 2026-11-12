import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ChoixLecture } from "@/components/ChoixLecture";
import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";

/** L'élève choisit sa lecture : obligatoire à la première connexion, modifiable ensuite. */
export default async function PageLectureEleve() {
  const profil = await exigerEspace("eleve");
  const premiereFois = profil.lecture === null;
  return (
    <>
      <EnteteEspace titre="Ma lecture" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        {!premiereFois ? (
          <Link href="/compte" className="lien-retour">
            <ChevronLeft size={18} aria-hidden="true" />
            Mon compte
          </Link>
        ) : (
          <p className="choix-lecture-bienvenue">
            Bienvenue{profil.prenom ? ` ${profil.prenom}` : ""} ! Une seule question avant de commencer.
          </p>
        )}
        <ChoixLecture
          eleveId={profil.id}
          actuelle={profil.lecture}
          retour="/eleve"
          premiereFois={premiereFois}
        />
      </main>
    </>
  );
}

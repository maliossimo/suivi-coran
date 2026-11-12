import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChoixLecture } from "@/components/ChoixLecture";
import { EnteteEspace } from "@/components/EnteteEspace";
import { deNom } from "@/domain/classe";
import { exigerEspace } from "@/services/acces";
import { eleveDeLaLecture } from "@/services/lecture";

/** Le Cheikh (ou l'admin) règle la lecture d'un élève. */
export default async function PageLectureEleveParCheikh({ params }: { params: Promise<{ id: string }> }) {
  const profil = await exigerEspace("maitre");
  const { id } = await params;
  const eleve = await eleveDeLaLecture(profil, id);
  if (!eleve) notFound();
  const base = `/maitre/eleves/${eleve.id}`;
  const nom = `${eleve.prenom} ${eleve.nom}`.trim();
  return (
    <>
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <Link href={base} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Fiche {deNom(nom)}
        </Link>
        <ChoixLecture
          eleveId={eleve.id}
          actuelle={eleve.lecture}
          retour={base}
          premiereFois={false}
          pourUnEleve={eleve.prenom || nom}
        />
      </main>
    </>
  );
}

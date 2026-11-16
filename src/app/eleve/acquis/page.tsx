import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireAcquis } from "@/components/acquis/FormulaireAcquis";
import { exigerEleveAvecLecture } from "@/services/acces";
import { chargerPageAcquis } from "@/services/acquis";

export const metadata = { title: "Ce que je connais déjà" };

/**
 * « Ce que tu connais déjà » : proposé une fois à l'arrivée (nouvel élève, ou inscrit avant
 * la fonctionnalité), puis modifiable depuis la Progression.
 */
export default async function PageAcquis({ searchParams }: { searchParams: Promise<{ arrivee?: string }> }) {
  const [profil, { arrivee }] = await Promise.all([exigerEleveAvecLecture(), searchParams]);
  const donnees = await chargerPageAcquis(profil.id);
  return (
    <>
      <EnteteEspace
        titre="Ce que je connais"
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role}
      />
      <main className="espace espace-etroit">
        {arrivee ? null : (
          <Link href="/eleve/progression" className="lien-retour">
            <ChevronLeft size={18} aria-hidden="true" />
            Ma progression
          </Link>
        )}
        <FormulaireAcquis donnees={donnees} arrivee={Boolean(arrivee)} />
      </main>
    </>
  );
}

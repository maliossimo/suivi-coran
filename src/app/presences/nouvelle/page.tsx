import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireClasse } from "@/components/presences/FormulaireClasse";
import { avecVue } from "@/domain/presences";
import { chargerFormulaireClasse, exigerPresences } from "@/services/presences";

export const metadata = { title: "Nouvelle classe" };

export default async function PageNouvelleClasse({
  searchParams,
}: {
  searchParams: Promise<{ etablissement?: string; vue?: string }>;
}) {
  const q = await searchParams;
  const { profil, apercu, peut } = await exigerPresences(q.vue);
  if (!peut.organiser) redirect(avecVue("/presences", apercu));
  const f = await chargerFormulaireClasse(undefined, q.etablissement);
  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <Link href={avecVue("/presences", apercu)} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Présences
        </Link>
        <section className="carte-graphique">
          <h1 className="titre-carte">Nouvelle classe</h1>
          <FormulaireClasse
            key={f.etablissementId ?? ""}
            classe={null}
            etablissements={f.etablissements}
            etablissementId={f.etablissementId}
            maitres={f.personnes.maitres}
          />
        </section>
      </main>
    </>
  );
}

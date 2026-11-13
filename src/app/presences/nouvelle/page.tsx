import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireClasse } from "@/components/presences/FormulaireClasse";
import { chargerFormulaireClasse, exigerPresences } from "@/services/presences";

export const metadata = { title: "Nouvelle classe" };

export default async function PageNouvelleClasse({
  searchParams,
}: {
  searchParams: Promise<{ etablissement?: string }>;
}) {
  const profil = await exigerPresences();
  const f = await chargerFormulaireClasse(profil, undefined, (await searchParams).etablissement);
  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <Link href="/presences" className="lien-retour">
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

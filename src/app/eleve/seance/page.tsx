import { redirect } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EcranSeance } from "@/components/fiche/EcranSeance";
import { exigerEspace } from "@/services/acces";
import { chargerSeance, lireDateSaisissable, lireType } from "@/services/fiche";

export default async function PageSeance({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string }>;
}) {
  const profil = await exigerEspace("eleve");
  const params = await searchParams;
  const date = lireDateSaisissable(params.date);
  const type = lireType(params.type);
  if (!date) redirect(`/eleve?type=${type}`);

  const donnees = await chargerSeance(profil.id, date, type);

  return (
    <>
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} role="Élève" />
      <main className="espace espace-etroit">
        <EcranSeance
          donnees={donnees}
          eleveId={profil.id}
          base="/eleve"
          date={date}
          type={type}
          vueMaitre={false}
        />
      </main>
    </>
  );
}

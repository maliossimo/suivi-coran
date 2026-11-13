import { notFound, redirect } from "next/navigation";
import { VueAdmin } from "@/components/admin/VueAdmin";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EcranSeance } from "@/components/fiche/EcranSeance";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";
import { chargerSeance, lireDateSaisissable, lireType } from "@/services/fiche";

export default async function PageSeanceMaitre({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; type?: string; passage?: string }>;
}) {
  const profil = await exigerEspace("maitre");
  const { id } = await params;
  const query = await searchParams;
  const eleve = /^[0-9a-f-]{36}$/i.test(id) ? await chargerEleve(id) : null;
  if (!eleve) notFound();

  const base = `/maitre/eleves/${eleve.id}`;
  const date = lireDateSaisissable(query.date);
  const type = lireType(query.type);
  if (!date) redirect(base);

  const donnees = await chargerSeance(eleve.id, date, type, query.passage);

  return (
    <>
      <EnteteEspace
        titre={`${eleve.prenom} ${eleve.nom}`}
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role}
      />
      <main className="espace espace-etroit">
        <VueAdmin actif={profil.role === "admin"}>
          <EcranSeance donnees={donnees} eleveId={eleve.id} base={base} date={date} type={type} vueMaitre />
        </VueAdmin>
      </main>
    </>
  );
}

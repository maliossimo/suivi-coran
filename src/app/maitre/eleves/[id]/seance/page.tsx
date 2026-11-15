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
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const idValide = /^[0-9a-f-]{36}$/i.test(id);
  const date = lireDateSaisissable(query.date);
  const type = lireType(query.type);
  // Droits, élève et séance demandés en même temps (la base filtre de toute façon selon les droits) :
  // un seul aller-retour au lieu de trois à la suite.
  const [profil, eleve, donneesEnAvance] = await Promise.all([
    exigerEspace("maitre"),
    idValide ? chargerEleve(id) : null,
    idValide && date ? chargerSeance(id, date, type, query.passage).catch(() => null) : null,
  ]);
  if (!eleve) notFound();

  const base = `/maitre/eleves/${eleve.id}`;
  if (!date) redirect(base);
  // En cas d'échec de la lecture anticipée, on recommence (et une vraie erreur s'affiche).
  const donnees = donneesEnAvance ?? (await chargerSeance(eleve.id, date, type, query.passage));

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

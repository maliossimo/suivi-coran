import Link from "next/link";
import { notFound } from "next/navigation";
import { actionArchiverEleve } from "@/app/actions/classe";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FicheMois } from "@/components/fiche/FicheMois";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";
import { chargerFiche } from "@/services/fiche";

export default async function PageEleveMaitre({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mois?: string; type?: string }>;
}) {
  const profil = await exigerEspace("maitre");
  const { id } = await params;
  const { mois, type } = await searchParams;
  const eleve = /^[0-9a-f-]{36}$/i.test(id) ? await chargerEleve(id) : null;
  if (!eleve) notFound();

  const fiche = await chargerFiche(eleve.id, mois, type);
  const base = `/maitre/eleves/${eleve.id}`;

  return (
    <>
      <EnteteEspace
        titre="Ma classe"
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role === "admin" ? "Administrateur" : "Maître"}
      />
      <main className="espace">
        <Link href="/maitre" className="lien-retour">
          ‹ Toute la classe
        </Link>
        <div className="entete-page">
          <div className="entete-eleve">
            <span className="avatar avatar-clair avatar-grand" aria-hidden="true">
              {`${eleve.prenom[0] ?? ""}${eleve.nom[0] ?? ""}`.toUpperCase()}
            </span>
            <div>
              <h1>
                {eleve.prenom} {eleve.nom}
              </h1>
              {!eleve.actif ? <span className="pastille-or">Archivé</span> : null}
            </div>
          </div>
          <div className="actions-entete">
            <Link href={`${base}/progression`} className="bouton-secondaire bouton-lien">
              Progression
            </Link>
            <form action={actionArchiverEleve}>
              <input type="hidden" name="eleveId" value={eleve.id} />
              <input type="hidden" name="actif" value={eleve.actif ? "false" : "true"} />
              <button type="submit" className="bouton-secondaire">
                {eleve.actif ? "Archiver" : "Réactiver"}
              </button>
            </form>
          </div>
        </div>
        <FicheMois fiche={fiche} eleveId={eleve.id} base={base} />
      </main>
    </>
  );
}

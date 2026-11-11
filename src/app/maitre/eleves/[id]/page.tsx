import Link from "next/link";
import { notFound } from "next/navigation";
import { actionArchiverEleve } from "@/app/actions/classe";
import { ConfirmationSuppression } from "@/components/ConfirmationSuppression";
import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { FicheDifferee } from "@/components/fiche/FicheDifferee";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";

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

  const base = `/maitre/eleves/${eleve.id}`;

  return (
    <>
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
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
        {!eleve.actif ? (
          <section className="bandeau-archive">
            <p>
              <strong>Élève archivé.</strong> Il ne peut plus se connecter ; son historique reste consultable.
              Réactive-le s’il revient, ou supprime-le définitivement.
            </p>
            <ConfirmationSuppression eleveId={eleve.id} prenom={eleve.prenom} nom={eleve.nom} />
          </section>
        ) : null}
        <Suspense key={`${mois}-${type}`} fallback={<Squelettes />}>
          <FicheDifferee eleveId={eleve.id} base={base} mois={mois} type={type} vueMaitre />
        </Suspense>
      </main>
    </>
  );
}

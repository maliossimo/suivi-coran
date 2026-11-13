import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { actionArchiverEleve } from "@/app/actions/classe";
import { ConfirmationSuppression } from "@/components/ConfirmationSuppression";
import { EtiquetteLecture } from "@/components/ChoixLecture";
import { VueAdmin } from "@/components/admin/VueAdmin";
import { EnteteEspace } from "@/components/EnteteEspace";
import { Suspense } from "react";
import { Squelettes } from "@/components/Chargement";
import { FicheDifferee } from "@/components/fiche/FicheDifferee";
import { exigerEspace } from "@/services/acces";
import { chargerEleve } from "@/services/classe";
import { Avatar } from "@/components/Avatar";

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
        <VueAdmin actif={profil.role === "admin"}>
          <Link href="/maitre" className="lien-retour">
            <ChevronLeft size={18} aria-hidden="true" />
            Toute la classe
          </Link>
          <div className="carte-eleve">
            <Avatar prenom={eleve.prenom} nom={eleve.nom} cle={eleve.id} taille="grand" />
            <div className="carte-eleve-identite">
              <h1>
                {eleve.prenom} {eleve.nom}
              </h1>
              <p className="entete-eleve-lecture">
                <EtiquetteLecture lecture={eleve.lecture} />
                <Link href={`${base}/lecture`} className="lien-discret">
                  {eleve.lecture ? "Changer" : "Choisir"}
                </Link>
                {!eleve.actif ? <span className="pastille-or">Archivé</span> : null}
              </p>
            </div>
            {eleve.actif ? (
              <details className="menu-plus carte-eleve-menu">
                <summary aria-label="Plus d’actions">
                  <Ellipsis size={20} aria-hidden="true" />
                </summary>
                <div className="menu-plus-liste">
                  <form action={actionArchiverEleve}>
                    <input type="hidden" name="eleveId" value={eleve.id} />
                    <input type="hidden" name="actif" value="false" />
                    <button type="submit" className="menu-plus-item">
                      Archiver l’élève
                      <small>Il ne pourra plus se connecter ; son historique est conservé.</small>
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              <form action={actionArchiverEleve} className="carte-eleve-menu">
                <input type="hidden" name="eleveId" value={eleve.id} />
                <input type="hidden" name="actif" value="true" />
                <button type="submit" className="bouton-secondaire">
                  Réactiver
                </button>
              </form>
            )}
            <Link href={`${base}/progression`} className="carte-eleve-progression">
              <ChartNoAxesColumn size={18} aria-hidden="true" />
              <span>Voir la progression</span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {!eleve.actif ? (
            <section className="bandeau-archive">
              <p>
                <strong>Élève archivé.</strong> Il ne peut plus se connecter ; son historique reste
                consultable. Réactive-le s’il revient, ou supprime-le définitivement.
              </p>
              <ConfirmationSuppression eleveId={eleve.id} prenom={eleve.prenom} nom={eleve.nom} />
            </section>
          ) : null}
          {/* Pas de clé : en changeant de mois ou d’onglet, la fiche reste affichée jusqu’à l’arrivée de la suivante. */}
          <Suspense fallback={<Squelettes />}>
            <FicheDifferee eleveId={eleve.id} base={base} mois={mois} type={type} vueMaitre />
          </Suspense>
        </VueAdmin>
      </main>
    </>
  );
}

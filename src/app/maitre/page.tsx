import Link from "next/link";
import { Suspense } from "react";
import { cleMois, decalerMois, formaterDuree, libelleMois, lireMois } from "@/domain/fiche";
import { Squelettes } from "@/components/Chargement";
import { EnteteEspace } from "@/components/EnteteEspace";
import { ListeEleves } from "@/components/ListeEleves";
import { exigerEspace } from "@/services/acces";
import { chargerClasse } from "@/services/classe";
import { aujourdhuiParis } from "@/services/fiche";

/** Chiffres de la classe et liste des élèves, chargés après l'en-tête. */
async function ContenuClasse({ moisParam }: { moisParam?: string }) {
  const classe = await chargerClasse(moisParam);
  const cle = cleMois(classe.mois);
  const minutes = classe.actifs.reduce((t, r) => t + r.minutesApprentissage + r.minutesRevision, 0);
  const atteints = classe.actifs.reduce((t, r) => t + r.objectifsAtteints, 0);
  const objectifs = classe.actifs.reduce((t, r) => t + r.objectifsTotal, 0);
  const enAlerte = classe.actifs.filter((r) => r.alerte).length;

  return (
    <>
      <div className="tuiles">
        <div className="tuile">
          <strong>{classe.actifs.length}</strong>
          <span>élève{classe.actifs.length > 1 ? "s" : ""}</span>
        </div>
        <div className="tuile">
          <strong>{formaterDuree(minutes)}</strong>
          <span>de travail ce mois-ci</span>
        </div>
        <div className="tuile">
          <strong>
            {atteints} / {objectifs}
          </strong>
          <span>objectifs atteints</span>
        </div>
        <div className={enAlerte ? "tuile tuile-alerte" : "tuile"}>
          <strong>{enAlerte}</strong>
          <span>sans saisie depuis 3 jours</span>
        </div>
      </div>

      {classe.actifs.length === 0 ? (
        <section className="carte-accueil">
          <h2>Aucun élève pour l’instant</h2>
          <p>Invite tes élèves : ils recevront un e-mail pour choisir leur mot de passe.</p>
        </section>
      ) : null}
      <ListeEleves actifs={classe.actifs} archives={classe.archives} cleMois={cle} />
    </>
  );
}

export default async function PageClasse({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const profil = await exigerEspace("maitre");
  const { mois: moisParam } = await searchParams;
  const mois = lireMois(moisParam, aujourdhuiParis());
  return (
    <>
      <EnteteEspace titre="Ma classe" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        <div className="entete-page">
          <nav className="mois mois-compact" aria-label="Changer de mois">
            <Link
              className="mois-fleche"
              href={`/maitre?mois=${cleMois(decalerMois(mois, -1))}`}
              aria-label="Mois précédent"
            >
              ‹
            </Link>
            <h1 className="mois-titre">{libelleMois(mois)}</h1>
            <Link
              className="mois-fleche"
              href={`/maitre?mois=${cleMois(decalerMois(mois, 1))}`}
              aria-label="Mois suivant"
            >
              ›
            </Link>
          </nav>
          {profil.role === "maitre" ? (
            <Link href="/maitre/inviter" className="bouton bouton-lien">
              + Inviter un élève
            </Link>
          ) : null}
        </div>

        <Suspense key={cleMois(mois)} fallback={<Squelettes cartes={1} />}>
          <ContenuClasse moisParam={moisParam} />
        </Suspense>
      </main>
    </>
  );
}

import Link from "next/link";
import { libelleDerniereSaisie, type ResumeEleve } from "@/domain/classe";
import { cleMois, decalerMois, formaterDuree, libelleMois } from "@/domain/fiche";
import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";
import { chargerClasse } from "@/services/classe";

function initiales(r: ResumeEleve): string {
  return `${r.eleve.prenom[0] ?? ""}${r.eleve.nom[0] ?? ""}`.toUpperCase() || "?";
}

export default async function PageClasse({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const profil = await exigerEspace("maitre");
  const { mois: moisParam } = await searchParams;
  const classe = await chargerClasse(moisParam);
  const cle = cleMois(classe.mois);
  const minutes = classe.actifs.reduce((t, r) => t + r.minutesApprentissage + r.minutesRevision, 0);
  const atteints = classe.actifs.reduce((t, r) => t + r.objectifsAtteints, 0);
  const objectifs = classe.actifs.reduce((t, r) => t + r.objectifsTotal, 0);
  const enAlerte = classe.actifs.filter((r) => r.alerte).length;

  return (
    <>
      <EnteteEspace
        titre="Ma classe"
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role === "admin" ? "Administrateur" : "Maître"}
      />
      <main className="espace">
        <div className="entete-page">
          <nav className="mois mois-compact" aria-label="Changer de mois">
            <Link
              className="mois-fleche"
              href={`/maitre?mois=${cleMois(decalerMois(classe.mois, -1))}`}
              aria-label="Mois précédent"
            >
              ‹
            </Link>
            <h1 className="mois-titre">{libelleMois(classe.mois)}</h1>
            <Link
              className="mois-fleche"
              href={`/maitre?mois=${cleMois(decalerMois(classe.mois, 1))}`}
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
        ) : (
          <ul className="liste-eleves">
            {classe.actifs.map((r) => (
              <li key={r.eleve.id}>
                <Link href={`/maitre/eleves/${r.eleve.id}?mois=${cle}`} className="carte-eleve">
                  <span className="avatar avatar-clair" aria-hidden="true">
                    {initiales(r)}
                  </span>
                  <span className="carte-eleve-nom">
                    {r.eleve.prenom} {r.eleve.nom}
                    <small className={r.alerte ? "texte-alerte" : undefined}>
                      Dernière saisie : {libelleDerniereSaisie(r.joursSansSaisie)}
                    </small>
                  </span>
                  <span className="carte-eleve-stats">
                    <span>
                      <b>{formaterDuree(r.minutesApprentissage)}</b> apprentissage
                    </span>
                    <span>
                      <b>{formaterDuree(r.minutesRevision)}</b> révision
                    </span>
                    <span>
                      <b>{r.joursTravailles}</b> j travaillés
                    </span>
                    <span>
                      <b>
                        {r.objectifsAtteints}/{r.objectifsTotal}
                      </b>{" "}
                      objectifs
                    </span>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {classe.archives.length > 0 ? (
          <details className="archives">
            <summary>Élèves archivés ({classe.archives.length})</summary>
            <ul>
              {classe.archives.map((r) => (
                <li key={r.eleve.id}>
                  <Link href={`/maitre/eleves/${r.eleve.id}`}>
                    {r.eleve.prenom} {r.eleve.nom}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
    </>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { actionRenvoyerInvitation } from "@/app/actions/admin";
import { EtatDuSite } from "@/components/admin/EtatDuSite";
import { LigneEtablissement } from "@/components/admin/LigneEtablissement";
import { TableauUtilisateurs } from "@/components/admin/TableauUtilisateurs";
import { Squelettes } from "@/components/Chargement";
import { AnneauProgression } from "@/components/AnneauProgression";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireEtablissement } from "@/components/FormulaireEtablissement";
import { FormulaireInvitation } from "@/components/FormulaireInvitation";
import { GraphiqueUsage } from "@/components/admin/GraphiqueUsage";
import { formaterDuree } from "@/domain/fiche";
import { exigerEspace } from "@/services/acces";
import { chargerTableauAdmin } from "@/services/admin";
import { chargerSecurite } from "@/services/securite";

const ROLES = { eleve: "Élève", maitre: "Cheikh", admin: "Admin" } as const;

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export default async function PageAdmin() {
  const profil = await exigerEspace("admin");
  const [t, securite] = await Promise.all([chargerTableauAdmin(profil), chargerSecurite(profil)]);
  const nomEtab = new Map(t.etablissements.map((e) => [e.id, e.nom]));
  const st = t.stats;

  return (
    <>
      <EnteteEspace titre="Administration" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        {securite.appareils.length === 0 ? (
          <div className="bandeau-archive" role="status">
            <p>
              <strong>Active la double vérification.</strong> Un code de ton téléphone sera demandé en plus du
              mot de passe : ton compte admin reste protégé même si le mot de passe fuite.
            </p>
            <Link href="/admin/securite" className="bouton">
              Activer
            </Link>
          </div>
        ) : null}
        <div className="tuiles">
          <div className="tuile">
            <strong>{st.eleves.actifs}</strong>
            <span>
              élèves
              {st.eleves.archives
                ? ` · ${st.eleves.archives} archivé${st.eleves.archives > 1 ? "s" : ""}`
                : ""}
            </span>
          </div>
          <div className="tuile">
            <strong>{st.maitres.actifs}</strong>
            <span>
              Cheikh{st.maitres.actifs > 1 ? "s" : ""} · {t.etablissements.length} établissement
              {t.etablissements.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="tuile tuile-or tuile-anneau">
            <AnneauProgression
              pourcentage={st.tauxActivite7j}
              taille={64}
              epaisseur={7}
              libelle={`${st.tauxActivite7j} % des élèves actifs sur 7 jours`}
            />
            <span>
              {st.elevesActifs7j} élève{st.elevesActifs7j > 1 ? "s" : ""} actif
              {st.elevesActifs7j > 1 ? "s" : ""} sur 7 jours
            </span>
          </div>
          <div className="tuile">
            <strong>{st.seances7j}</strong>
            <span>séances sur 7 jours · {formaterDuree(st.minutes7j)}</span>
          </div>
        </div>

        <div className="grille-graphiques">
          <section className="carte-graphique">
            <h2>Séances par semaine</h2>
            <p className="carte-graphique-sous">
              Les 12 dernières semaines · {st.seances30j} séances sur 30 jours. La semaine en cours est en
              doré.
            </p>
            <GraphiqueUsage semaines={st.semaines} />
          </section>

          <section className="carte-graphique">
            <h2>Activité par établissement</h2>
            {st.parEtablissement.length === 0 ? (
              <p className="carte-graphique-sous">Aucun établissement pour l’instant.</p>
            ) : (
              <div className="tableau-defilant">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Établissement</th>
                      <th>Cheikhs</th>
                      <th>Élèves</th>
                      <th>Actifs 7 j</th>
                      <th>Sans saisie 7 j</th>
                      <th>À voir</th>
                      <th>Hafs / Warsh</th>
                      <th>Lecture à choisir</th>
                      <th>Séances 30 j</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.parEtablissement.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Link href={`/maitre?classe=${e.id}`}>{e.nom}</Link>
                        </td>
                        <td>{e.maitres}</td>
                        <td>{e.eleves}</td>
                        <td>{e.elevesActifs7j}</td>
                        <td className={e.sansSaisie7j ? "cellule-alerte" : undefined}>{e.sansSaisie7j}</td>
                        <td className={e.aVoir ? "cellule-or" : undefined}>{e.aVoir}</td>
                        <td>
                          {e.hafs} / {e.warsh}
                        </td>
                        <td className={e.sansLecture ? "cellule-or" : undefined}>{e.sansLecture}</td>
                        <td>{e.seances30j}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="grille-graphiques">
          <section className="carte-graphique">
            <h2>Établissements</h2>
            {t.etablissements.length === 0 ? (
              <p className="carte-graphique-sous">
                Crée le premier établissement pour pouvoir inviter un Cheikh.
              </p>
            ) : (
              <ul className="liste-simple liste-etablissements">
                {t.etablissements.map((e) => (
                  <LigneEtablissement
                    key={e.id}
                    id={e.id}
                    nom={e.nom}
                    maitres={e.maitres}
                    eleves={e.eleves}
                    comptes={e.comptes}
                  />
                ))}
              </ul>
            )}
            <FormulaireEtablissement />
          </section>

          <section className="carte-graphique">
            <h2>Inviter un Cheikh</h2>
            <p className="carte-graphique-sous">Il pourra ensuite inviter ses élèves.</p>
            <FormulaireInvitation cible="maitre" etablissements={t.etablissements} />
          </section>
        </div>

        {t.invitationsEnAttente.length > 0 ? (
          <section className="carte-graphique">
            <h2>Invitations en attente ({t.invitationsEnAttente.length})</h2>
            <p className="carte-graphique-sous">
              Invités qui ne se sont encore jamais connectés. « Renvoyer » leur envoie un nouvel e-mail pour
              choisir leur mot de passe.
            </p>
            <ul className="liste-simple">
              {t.invitationsEnAttente.map((u) => (
                <li key={u.id} className="ligne-invitation">
                  <span className="ligne-invitation-qui">
                    <b>{`${u.prenom} ${u.nom}`.trim() || "Sans nom"}</b>
                    <span>
                      {ROLES[u.role]}
                      {u.etablissementId ? ` · ${nomEtab.get(u.etablissementId) ?? ""}` : ""}
                      {u.email ? ` · ${u.email}` : ""}
                      {u.inviteLe ? ` · invité le ${dateCourte(u.inviteLe)}` : ""}
                    </span>
                  </span>
                  <form action={actionRenvoyerInvitation}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="bouton-secondaire bouton-auto">
                      Renvoyer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="carte-graphique">
          <h2>Utilisateurs ({t.utilisateurs.length})</h2>
          {!t.comptesLisibles ? (
            <p className="carte-graphique-sous">
              Dernières connexions et invitations indisponibles : clé « service role » non configurée.
            </p>
          ) : null}
          <TableauUtilisateurs
            utilisateurs={t.utilisateurs}
            etablissements={t.etablissements}
            moi={profil.id}
          />
        </section>

        <Suspense fallback={<Squelettes cartes={1} tuiles={false} />}>
          <EtatDuSite />
        </Suspense>

        <p className="carte-graphique-sous">
          Double vérification :{" "}
          {securite.appareils.length
            ? `active (${securite.appareils.length} appareil${securite.appareils.length > 1 ? "s" : ""})`
            : "non active"}{" "}
          · <Link href="/admin/securite">Gérer les appareils</Link>
        </p>
      </main>
    </>
  );
}

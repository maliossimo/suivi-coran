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

const ROLES = { eleve: "Élève", maitre: "Cheikh", admin: "Admin" } as const;

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export default async function PageAdmin() {
  const profil = await exigerEspace("admin");
  const t = await chargerTableauAdmin(profil);
  const nomEtab = new Map(t.etablissements.map((e) => [e.id, e.nom]));
  const st = t.stats;
  const activite = new Map(st.parEtablissement.map((e) => [e.id, e]));

  return (
    <>
      <EnteteEspace titre="Administration" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-admin">
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

        <Suspense fallback={<Squelettes cartes={1} tuiles={false} />}>
          <EtatDuSite />
        </Suspense>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Séances par semaine</h2>
            <span className="admin-compte">{st.seances30j} sur 30 jours</span>
          </div>
          <GraphiqueUsage semaines={st.semaines} />
        </section>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Établissements</h2>
            <span className="admin-compte">{t.etablissements.length}</span>
          </div>
          {t.etablissements.length === 0 ? (
            <p className="carte-graphique-sous">
              Crée le premier établissement pour pouvoir inviter un Cheikh.
            </p>
          ) : (
            <ul className="liste-etablissements">
              {t.etablissements.map((e) => (
                <LigneEtablissement
                  key={e.id}
                  id={e.id}
                  nom={e.nom}
                  maitres={e.maitres}
                  eleves={e.eleves}
                  comptes={e.comptes}
                  activite={activite.get(e.id)}
                />
              ))}
            </ul>
          )}
          <details className="admin-repli" open={t.etablissements.length === 0}>
            <summary>+ Nouvel établissement</summary>
            <FormulaireEtablissement />
          </details>
        </section>

        <section className="carte-graphique">
          <h2>Inviter un Cheikh</h2>
          <p className="carte-graphique-sous">Il pourra ensuite inviter ses élèves.</p>
          <FormulaireInvitation cible="maitre" etablissements={t.etablissements} />
          {t.invitationsEnAttente.length > 0 ? (
            <details className="admin-repli">
              <summary>En attente de première connexion ({t.invitationsEnAttente.length})</summary>
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
            </details>
          ) : null}
        </section>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Comptes</h2>
            <span className="admin-compte">{t.utilisateurs.length}</span>
          </div>
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
      </main>
    </>
  );
}

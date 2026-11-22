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
import { FormulaireLienCompte } from "@/components/admin/LiensComptes";
import { actionDelierComptes } from "@/app/actions/comptesLies";
import { liensDeLAdmin } from "@/services/comptesLies";
import { GraphiqueUsage } from "@/components/admin/GraphiqueUsage";
import { semainesUtiles } from "@/domain/usage";
import { formaterDuree } from "@/domain/fiche";
import { exigerEspace } from "@/services/acces";
import {
  chargerTableauAdmin,
  liensMawaqitDesEtablissements,
  positionsDesEtablissements,
} from "@/services/admin";
import { dateCourte } from "@/domain/format";
import { LIBELLE_ROLE } from "@/domain/roles";

export default async function PageAdmin() {
  const profil = await exigerEspace("admin");
  const [t, positions, liens, comptesLies] = await Promise.all([
    chargerTableauAdmin(profil),
    positionsDesEtablissements(profil),
    liensMawaqitDesEtablissements(profil),
    liensDeLAdmin(profil),
  ]);
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
            <h2>Séances</h2>
            <span className="admin-compte">{st.seances30j} sur 30 jours</span>
          </div>
          <p className="graphique-tete">
            <strong>{st.semaines.at(-1)?.seances ?? 0}</strong>
            <span>
              cette semaine
              {st.semaines.length > 1 ? ` · ${st.semaines.at(-2)?.seances ?? 0} la semaine dernière` : ""}
            </span>
          </p>
          <GraphiqueUsage semaines={semainesUtiles(st.semaines)} />
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
                  classes={t.classes.filter((c) => c.etablissementId === e.id)}
                  position={positions.get(e.id) ?? null}
                  mawaqit={liens.get(e.id) ?? null}
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
          <p className="carte-graphique-sous">
            Choisis sa mosquée et sa classe : il y retrouvera ses élèves et pourra en inviter d’autres.
          </p>
          <FormulaireInvitation
            cible="maitre"
            etablissements={t.etablissements}
            classes={t.classes.map((c) => ({ id: c.id, nom: c.nom, etablissementId: c.etablissementId }))}
          />
          {t.invitationsEnAttente.length > 0 ? (
            <details className="admin-repli">
              <summary>En attente de première connexion ({t.invitationsEnAttente.length})</summary>
              <ul className="liste-simple">
                {t.invitationsEnAttente.map((u) => (
                  <li key={u.id} className="ligne-invitation">
                    <span className="ligne-invitation-qui">
                      <b>{`${u.prenom} ${u.nom}`.trim() || "Sans nom"}</b>
                      <span>
                        {LIBELLE_ROLE[u.role]}
                        {u.etablissementId ? ` · ${nomEtab.get(u.etablissementId) ?? ""}` : ""}
                        {u.email ? ` · ${u.email}` : ""}
                        {u.inviteLe ? ` · invité le ${dateCourte(u.inviteLe, true)}` : ""}
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
          <h2>Inviter un élève</h2>
          <p className="carte-graphique-sous">
            Choisis sa mosquée et sa classe : l’élève reçoit un e-mail pour créer son compte et son Cheikh le
            voit tout de suite. Sans classe, seul le responsable de la mosquée (et toi) le voit.
          </p>
          <FormulaireInvitation
            cible="eleve"
            etablissements={t.etablissements}
            classes={t.classes.map((c) => ({ id: c.id, nom: c.nom, etablissementId: c.etablissementId }))}
          />
        </section>

        <section className="carte-graphique">
          <h2>Espaces liés</h2>
          <p className="carte-graphique-sous">
            Lie ton compte à un autre (par exemple ton compte élève) : à la connexion, tu choisis l’espace, et
            « Mon compte » permet de passer de l’un à l’autre sans mot de passe. Chaque compte lié peut ouvrir
            l’autre : garde-les tous deux protégés.
          </p>
          {comptesLies.length > 0 ? (
            <ul className="liste-simple">
              {comptesLies.map(({ a, b }) => (
                <li key={`${a.id}-${b.id}`} className="ligne-invitation">
                  <span className="ligne-invitation-qui">
                    <b>{`${a.prenom} ${a.nom}`.trim() || "Sans nom"}</b>
                    <span>
                      {LIBELLE_ROLE[a.role]} ↔ {`${b.prenom} ${b.nom}`.trim() || "Sans nom"} ·{" "}
                      {LIBELLE_ROLE[b.role]}
                    </span>
                  </span>
                  <form action={actionDelierComptes}>
                    <input type="hidden" name="a" value={a.id} />
                    <input type="hidden" name="b" value={b.id} />
                    <button className="bouton bouton-secondaire" type="submit">
                      Retirer le lien
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
          <FormulaireLienCompte />
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

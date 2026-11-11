import { actionBasculerUtilisateur } from "@/app/actions/admin";
import { AnneauProgression } from "@/components/AnneauProgression";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireEtablissement } from "@/components/FormulaireEtablissement";
import { FormulaireInvitation } from "@/components/FormulaireInvitation";
import { GraphiqueUsage } from "@/components/admin/GraphiqueUsage";
import { SuppressionUtilisateur } from "@/components/SuppressionUtilisateur";
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

  return (
    <>
      <EnteteEspace titre="Administration" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
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
                      <th>Séances 30 j</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.parEtablissement.map((e) => (
                      <tr key={e.id}>
                        <td>{e.nom}</td>
                        <td>{e.maitres}</td>
                        <td>{e.eleves}</td>
                        <td>{e.elevesActifs7j}</td>
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
              <ul className="liste-simple">
                {t.etablissements.map((e) => (
                  <li key={e.id}>
                    <b>{e.nom}</b>
                    <span>
                      {e.maitres} Cheikh{e.maitres > 1 ? "s" : ""} · {e.eleves} élève{e.eleves > 1 ? "s" : ""}
                    </span>
                  </li>
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

        <section className="carte-graphique">
          <h2>Utilisateurs ({t.utilisateurs.length})</h2>
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Établissement</th>
                  <th>Inscrit le</th>
                  <th>Dernière connexion</th>
                  <th>Statut</th>
                  <th>Suppression</th>
                </tr>
              </thead>
              <tbody>
                {t.utilisateurs.map((u) => (
                  <tr key={u.id}>
                    <td>{`${u.prenom} ${u.nom}`.trim() || "—"}</td>
                    <td>
                      <span className={`pastille-role pastille-${u.role}`}>{ROLES[u.role]}</span>
                    </td>
                    <td>{u.etablissementId ? (nomEtab.get(u.etablissementId) ?? "—") : "—"}</td>
                    <td>{dateCourte(u.creeLe)}</td>
                    <td>{u.derniereConnexion ? dateCourte(u.derniereConnexion) : "Jamais"}</td>
                    <td>
                      {u.id === profil.id ? (
                        "Vous"
                      ) : (
                        <form action={actionBasculerUtilisateur}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="actif" value={u.actif ? "false" : "true"} />
                          <button
                            type="submit"
                            className={u.actif ? "lien-action" : "lien-action lien-action-off"}
                          >
                            {u.actif ? "Actif · désactiver" : "Désactivé · réactiver"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td>
                      {u.id === profil.id || u.role === "admin" ? (
                        "—"
                      ) : (
                        <SuppressionUtilisateur id={u.id} prenom={u.prenom} nom={u.nom} role={u.role} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

import { actionBasculerUtilisateur } from "@/app/actions/admin";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireEtablissement } from "@/components/FormulaireEtablissement";
import { FormulaireInvitation } from "@/components/FormulaireInvitation";
import { MenuAdmin } from "@/components/MenuAdmin";
import { exigerEspace } from "@/services/acces";
import { chargerTableauAdmin } from "@/services/admin";

const ROLES = { eleve: "Élève", maitre: "Maître", admin: "Admin" } as const;

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export default async function PageAdmin() {
  const profil = await exigerEspace("admin");
  const t = await chargerTableauAdmin(profil);
  const nomEtab = new Map(t.etablissements.map((e) => [e.id, e.nom]));
  const actifs = t.utilisateurs.filter((u) => u.actif);

  return (
    <>
      <EnteteEspace
        titre="Administration"
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role="Administrateur"
      />
      <main className="espace">
        <MenuAdmin actif="tableau" />

        <div className="tuiles">
          <div className="tuile">
            <strong>{t.etablissements.length}</strong>
            <span>établissement{t.etablissements.length > 1 ? "s" : ""}</span>
          </div>
          <div className="tuile">
            <strong>{actifs.filter((u) => u.role === "maitre").length}</strong>
            <span>maîtres actifs</span>
          </div>
          <div className="tuile">
            <strong>{actifs.filter((u) => u.role === "eleve").length}</strong>
            <span>élèves actifs</span>
          </div>
          <div className="tuile">
            <strong>{t.seances7j}</strong>
            <span>séances sur 7 jours</span>
          </div>
        </div>

        <div className="grille-graphiques">
          <section className="carte-graphique">
            <h2>Établissements</h2>
            {t.etablissements.length === 0 ? (
              <p className="carte-graphique-sous">
                Crée le premier établissement pour pouvoir inviter un maître.
              </p>
            ) : (
              <ul className="liste-simple">
                {t.etablissements.map((e) => (
                  <li key={e.id}>
                    <b>{e.nom}</b>
                    <span>
                      {e.maitres} maître{e.maitres > 1 ? "s" : ""} · {e.eleves} élève{e.eleves > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <FormulaireEtablissement />
          </section>

          <section className="carte-graphique">
            <h2>Inviter un maître</h2>
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
                  <th>Statut</th>
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

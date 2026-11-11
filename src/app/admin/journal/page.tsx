import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";
import { chargerJournal } from "@/services/admin";

const ACTIONS: Record<string, string> = { INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression" };
const TABLES: Record<string, string> = {
  seances: "Séance",
  passages: "Passage",
  objectifs: "Objectif",
  bilans_mensuels: "Bilan",
  commentaires: "Commentaire",
  profils: "Profil",
  etablissements: "Établissement",
};

function dateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function PageJournal() {
  const profil = await exigerEspace("admin");
  const { evenements, noms } = await chargerJournal(profil);

  return (
    <>
      <EnteteEspace titre="Administration" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        <section className="carte-graphique">
          <h2>Journal d’audit</h2>
          <p className="carte-graphique-sous">
            Les 150 dernières actions. Ce journal est rempli par la base elle-même et ne peut pas être
            modifié.
          </p>
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Quand</th>
                  <th>Qui</th>
                  <th>Action</th>
                  <th>Élément</th>
                  <th>Élève concerné</th>
                </tr>
              </thead>
              <tbody>
                {evenements.map((e) => (
                  <tr key={e.id}>
                    <td>{dateHeure(e.quand)}</td>
                    <td>{e.acteurId ? (noms.get(e.acteurId) ?? "Inconnu") : "Système"}</td>
                    <td>{ACTIONS[e.action] ?? e.action}</td>
                    <td>{TABLES[e.table] ?? e.table}</td>
                    <td>{e.eleveId ? (noms.get(e.eleveId) ?? "—") : "—"}</td>
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

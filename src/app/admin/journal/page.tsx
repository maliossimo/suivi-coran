import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";
import { chargerJournal } from "@/services/admin";

const ACTIONS: Record<string, string> = {
  INSERT: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  SUPPRESSION_UTILISATEUR: "Suppression d’un compte",
};
const TABLES: Record<string, string> = {
  seances: "Séance",
  passages: "Passage",
  objectifs: "Objectif",
  bilans_mensuels: "Bilan",
  commentaires: "Commentaire",
  profils: "Profil",
  etablissements: "Établissement",
  invitations_classe: "QR code de classe",
};

const ROLES = { eleve: "Élève", maitre: "Cheikh", admin: "Admin" } as const;

function dateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function PageJournal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profil = await exigerEspace("admin");
  const { evenements, noms, personnes, filtres, utilisation, ouvertures } = await chargerJournal(
    profil,
    await searchParams,
  );
  const filtre = Object.values(filtres).some(Boolean);

  return (
    <>
      <EnteteEspace titre="Administration" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        <section className="carte-graphique">
          <h2>Utilisation de l’appli</h2>
          <p className="carte-graphique-sous">
            Dernière fois que chacun a ouvert l’appli (ou y est revenu), même sans se reconnecter.
          </p>
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Qui</th>
                  <th>Rôle</th>
                  <th>Dernière utilisation</th>
                  <th>Ouvertures 7 j</th>
                </tr>
              </thead>
              <tbody>
                {utilisation.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nom}</td>
                    <td>{ROLES[c.role]}</td>
                    <td>{c.derniereUtilisation ? dateHeure(c.derniereUtilisation) : "Jamais"}</td>
                    <td>{c.ouvertures7j}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="details-ouvertures">
            <summary>
              {ouvertures.length ? `Les ${ouvertures.length} dernières ouvertures` : "Aucune ouverture notée"}
              {filtres.personne ? " de cette personne" : ""}
            </summary>
            <ul className="liste-simple">
              {ouvertures.map((o) => (
                <li key={o.id}>
                  <span>{dateHeure(o.quand)}</span>
                  <strong>{noms.get(o.personneId) ?? "Compte supprimé"}</strong>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="carte-graphique">
          <h2>Journal d’audit</h2>
          <p className="carte-graphique-sous">
            Les 150 dernières actions{filtre ? " correspondant aux filtres" : ""}. Ce journal est rempli par
            la base elle-même et ne peut pas être modifié.
          </p>
          <form className="filtres-admin" method="get">
            <select name="personne" defaultValue={filtres.personne ?? ""} aria-label="Personne">
              <option value="">Tout le monde</option>
              {personnes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
            <select name="action" defaultValue={filtres.action ?? ""} aria-label="Action">
              <option value="">Toutes les actions</option>
              {Object.entries(ACTIONS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select name="table" defaultValue={filtres.table ?? ""} aria-label="Élément">
              <option value="">Tous les éléments</option>
              {Object.entries(TABLES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <label className="filtre-date">
              Du
              <input type="date" name="du" defaultValue={filtres.du ?? ""} />
            </label>
            <label className="filtre-date">
              au
              <input type="date" name="au" defaultValue={filtres.au ?? ""} />
            </label>
            <button type="submit" className="bouton bouton-auto">
              Filtrer
            </button>
            {filtre ? (
              <Link href="/admin/journal" className="lien-discret">
                Effacer les filtres
              </Link>
            ) : null}
          </form>
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

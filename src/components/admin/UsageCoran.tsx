import { Avatar } from "@/components/Avatar";
import { depuisQuand } from "@/domain/journal";
import { LIBELLE_ROLE } from "@/domain/roles";
import type { ResumeUsageCoran } from "@/domain/usagesCoran";

/** Administration : qui lit, écoute et récite le Coran (7 derniers jours ; dernière fois sur 30 jours). */
export function UsageCoran({
  resume,
  noms,
  maintenant,
}: {
  resume: ResumeUsageCoran;
  /** Nom des sourates par numéro. */
  noms: Map<number, string>;
  maintenant: Date;
}) {
  return (
    <section className="carte-graphique usage-coran" aria-labelledby="titre-usage-coran">
      <div className="admin-titre">
        <h2 id="titre-usage-coran">Qui utilise le Coran</h2>
        <span className="admin-compte">
          {resume.lecteurs7j} lecteur{resume.lecteurs7j > 1 ? "s" : ""} · {resume.reciteurs7j} récitant
          {resume.reciteurs7j > 1 ? "s" : ""} sur 7 jours
        </span>
      </div>
      {resume.personnes.length === 0 ? (
        <p className="carte-graphique-sous">
          Personne n’a encore ouvert le Coran depuis la mise en place de ce suivi.
        </p>
      ) : (
        <ul className="liste-personnes">
          {resume.personnes.map((p) => (
            <li key={p.id}>
              <Avatar
                prenom={p.nom.split(" ")[0]}
                nom={p.nom.split(" ").slice(1).join(" ")}
                cle={p.id}
                role={p.role}
                taille="petit"
              />
              <span className="liste-personnes-nom">
                <b>{p.nom}</b>
                <small>
                  {LIBELLE_ROLE[p.role]}
                  {p.sourates.length
                    ? ` · ${p.sourates.map((s) => noms.get(s) ?? `Sourate ${s}`).join(", ")}`
                    : ""}
                </small>
              </span>
              <span className="usage-coran-compteurs">
                <span title="Lectures sur 7 jours">
                  <b>{p.lectures}</b> lu
                </span>
                <span title="Écoutes sur 7 jours">
                  <b>{p.ecoutes}</b> écouté
                </span>
                <span title="Récitations sur 7 jours">
                  <b>{p.recitations}</b> récité
                </span>
                <small>{depuisQuand(p.derniere, maintenant)}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

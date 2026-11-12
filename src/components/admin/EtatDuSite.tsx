import { exigerEspace } from "@/services/acces";
import { chargerEtatSite } from "@/services/admin";

function dateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function taille(octets: number | null): string {
  if (octets === null) return "";
  if (octets < 1024 * 1024) return ` · ${Math.max(1, Math.round(octets / 1024))} Ko`;
  return ` · ${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

/** Santé du site pour l'admin : version en ligne, dernière sauvegarde, erreurs rencontrées. */
export async function EtatDuSite() {
  const profil = await exigerEspace("admin");
  const e = await chargerEtatSite(profil);
  const age = e.sauvegarde ? (Date.now() - Date.parse(e.sauvegarde.faiteLe)) / 86_400_000 : null;
  const sauvegardeOk = age !== null && age < 2;

  return (
    <section className="carte-graphique etat-site">
      <h2>État du site</h2>
      <ul className="etat-site-liste">
        <li>
          <span className="etat-site-titre">Version en ligne</span>
          <span>
            <b>{e.version.numero}</b>
            {e.version.commit ? (
              <>
                {" · "}
                <code>{e.version.commit}</code>
              </>
            ) : null}
            {e.version.message ? ` · ${e.version.message}` : ""}
            {e.version.environnement !== "production" ? ` · ${e.version.environnement}` : ""}
          </span>
        </li>
        <li className={sauvegardeOk ? undefined : "etat-site-alerte"}>
          <span className="etat-site-titre">Dernière sauvegarde</span>
          <span>
            {e.sauvegarde
              ? `${dateHeure(e.sauvegarde.faiteLe)}${taille(e.sauvegarde.tailleOctets)} · ${
                  e.sauvegarde.chiffree ? "chiffrée" : "non chiffrée (ajoute le secret SAUVEGARDE_PHRASE)"
                }`
              : "aucune notée pour l’instant (la prochaine a lieu cette nuit)"}
            {e.sauvegarde && !sauvegardeOk ? " · plus de 2 jours : vérifie le workflow de sauvegarde" : ""}
          </span>
        </li>
        <li className={e.erreurs7j ? "etat-site-alerte" : undefined}>
          <span className="etat-site-titre">Erreurs (7 jours)</span>
          <span>
            {e.erreurs7j === 0
              ? "aucune"
              : `${e.erreurs7j} erreur${e.erreurs7j > 1 ? "s" : ""} rencontrée${e.erreurs7j > 1 ? "s" : ""}`}
            {e.sentryConfigure ? " · détail aussi dans Sentry" : ""}
          </span>
        </li>
      </ul>
      {e.erreurs.length > 0 ? (
        <div className="tableau-defilant">
          <table className="tableau">
            <thead>
              <tr>
                <th>Quand</th>
                <th>Page</th>
                <th>Message</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {e.erreurs.map((x) => (
                <tr key={x.id}>
                  <td>{dateHeure(x.quand)}</td>
                  <td>
                    <code>{x.page}</code>
                  </td>
                  <td>{x.message}</td>
                  <td>{x.version ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

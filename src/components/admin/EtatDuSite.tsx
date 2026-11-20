import { exigerEspace } from "@/services/acces";
import { chargerEtatSite } from "@/services/admin";
import Link from "next/link";
import { dateHeure } from "@/domain/format";
import { depuisQuand, expliquerErreur, nomDePage, regrouperErreurs } from "@/domain/journal";
import { actionReglerErreur } from "@/app/actions/admin";

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

  const toutVaBien = sauvegardeOk && e.erreurs7j === 0;

  return (
    <details className="carte-graphique etat-site etat-site-repliable" open={!toutVaBien}>
      <summary className="etat-site-resume">
        <span className={`etat-site-voyant${toutVaBien ? "" : " alerte"}`} aria-hidden="true" />
        <span>
          <b>{toutVaBien ? "Tout va bien" : "État du site"}</b>
          {" · "}
          {e.version.numero}
          {toutVaBien && e.sauvegarde ? ` · sauvegarde ${depuisQuand(e.sauvegarde.faiteLe, new Date())}` : ""}
          {!toutVaBien && e.erreurs7j ? ` · ${e.erreurs7j} erreur${e.erreurs7j > 1 ? "s" : ""}` : ""}
          {!toutVaBien && !sauvegardeOk ? " · sauvegarde à vérifier" : ""}
        </span>
      </summary>
      <ul className="etat-site-liste">
        <li>
          <span className="etat-site-titre">Version en ligne</span>
          <span>
            <b>{e.version.numero}</b>
            {e.version.miseEnLigne
              ? ` · mise en ligne ${depuisQuand(e.version.miseEnLigne, new Date())}`
              : ""}
            {e.version.environnement !== "production" ? ` · ${e.version.environnement}` : ""}
            {" · "}
            <Link href="/admin/nouveautes">voir les nouveautés</Link>
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
            {e.erreurs7j ? " · bug corrigé ? touche « Réglé » pour la retirer" : ""}
          </span>
        </li>
      </ul>
      {e.erreurs.length > 0 ? (
        <ul className="liste-erreurs">
          {regrouperErreurs(e.erreurs).map((g) => {
            const x = expliquerErreur(g.message);
            return (
              <li key={g.message} data-gravite={x.sansGravite ? "faible" : "a-voir"}>
                <span className="liste-erreurs-tete">
                  <b className={`erreur-famille erreur-${x.type}`}>{x.famille}</b>
                  {x.sansGravite ? <em className="erreur-sans-gravite">sans gravité</em> : null}
                  <span>
                    {dateHeure(g.quand)}
                    {g.nombre > 1 ? ` · ${g.nombre} fois` : ""} · {g.pages.map(nomDePage).join(", ")}
                  </span>
                </span>
                <span className="liste-erreurs-explication">{x.explication}</span>
                <details className="liste-erreurs-detail">
                  <summary>Détail technique</summary>
                  <span className="liste-erreurs-message">{g.message}</span>
                  <code>{g.pages.join(", ")}</code>
                </details>
                <span className="liste-erreurs-pied">
                  <small>version en ligne {g.versions.join(", ") || "—"}</small>
                  <form action={actionReglerErreur}>
                    <input type="hidden" name="message" value={g.message} />
                    <button type="submit" className="liste-erreurs-reglee">
                      ✓ Réglé
                    </button>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </details>
  );
}

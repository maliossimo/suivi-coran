"use client";

import { erreurDeVersion } from "@/domain/miseAJour";
import { VERSION } from "@/lib/version";
import { actionSignalerErreur } from "./actions/erreur";

const CLE = "rechargement-apres-plantage";

/**
 * Une page a planté. Si c'est un décalage de versions (nouvelle version mise en ligne pendant que l'appli
 * était ouverte), la page est rechargée une fois, sans rien montrer : elle s'ouvre dans la bonne version.
 * Sinon, l'admin est prévenu avec le message, la version chargée sur le téléphone et le début de la pile.
 * Renvoie true si la page se recharge.
 */
export function signalerPlantage(error: Error & { digest?: string }): boolean {
  const page = window.location.pathname + window.location.search;
  if (erreurDeVersion(error.name, error.message)) {
    let dejaFait = false;
    try {
      dejaFait = Date.now() - Number(sessionStorage.getItem(CLE) ?? 0) < 60_000;
      if (!dejaFait) sessionStorage.setItem(CLE, String(Date.now()));
    } catch {
      dejaFait = true; // sans stockage, pas de risque de boucle : on n'essaie pas
    }
    if (!dejaFait) {
      window.location.reload();
      return true;
    }
  }
  const pile = (error.stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith(error.name))
    .slice(0, 3)
    .join(" | ");
  const message = [
    error.digest ? `${error.message} (réf. ${error.digest})` : error.message,
    `appli ${VERSION}`,
    pile,
  ]
    .filter(Boolean)
    .join(" — ");
  void actionSignalerErreur(page, message);
  return false;
}

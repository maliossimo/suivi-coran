"use client";

import { useEffect } from "react";
import { VERSION } from "@/lib/version";
import { actionSignalerErreur } from "./actions/erreur";

/** Une page a planté : on garde le cadre de l'appli, on propose de réessayer, l'admin est prévenu. */
export default function ErreurPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Message, version de l'appli chargée dans le téléphone (elle peut être plus ancienne que celle en
    // ligne) et premières lignes de la pile : de quoi retrouver la cause sans le téléphone.
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
    void actionSignalerErreur(window.location.pathname + window.location.search, message);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <main className="espace espace-etroit erreur-page">
      <h1>Oups, quelque chose s’est mal passé.</h1>
      <p>L’erreur a été signalée. Tu peux réessayer ; si ça recommence, préviens ton Cheikh.</p>
      <button type="button" className="bouton" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}

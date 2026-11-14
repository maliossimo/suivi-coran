"use client";

import { useEffect } from "react";
import { signalerPlantage } from "./signalerPlantage";

/** Une page a planté : on garde le cadre de l'appli, on propose de réessayer, l'admin est prévenu. */
export default function ErreurPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (signalerPlantage(error)) return; // nouvelle version : la page se recharge
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

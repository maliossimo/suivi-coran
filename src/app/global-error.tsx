"use client";

import { useEffect } from "react";
import { VERSION } from "@/lib/version";
import { actionSignalerErreur } from "./actions/erreur";

/** Dernier filet : une erreur imprévue affiche cette page et part dans les alertes. */
export default function ErreurGlobale({
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
    // Sentry n'est chargé que s'il est configuré.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center", color: "#1c2420" }}
      >
        <h1 style={{ fontSize: 22 }}>Oups, quelque chose s’est mal passé.</h1>
        <p>L’erreur nous a été signalée. Tu peux réessayer.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 12,
            height: 44,
            padding: "0 20px",
            borderRadius: 10,
            border: 0,
            background: "#1d5c47",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}

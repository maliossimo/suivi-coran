"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Dernier filet : une erreur imprévue affiche cette page et part dans les alertes. */
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
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

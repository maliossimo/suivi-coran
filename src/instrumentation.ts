import * as Sentry from "@sentry/nextjs";

/**
 * Alertes d'erreurs côté serveur (pages, actions, routes) envoyées à Sentry.
 * Inactif tant que NEXT_PUBLIC_SENTRY_DSN n'est pas défini. Aucune donnée
 * personnelle n'est envoyée (pas d'e-mail, pas d'adresse IP, pas de cookies).
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    sendDefaultPii: false,
    tracesSampleRate: 0, // erreurs seulement : reste dans l'offre gratuite
  });
}

export const onRequestError = Sentry.captureRequestError;

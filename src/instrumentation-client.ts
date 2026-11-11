import * as Sentry from "@sentry/nextjs";

// Alertes d'erreurs dans le navigateur (élèves, maîtres). Inactif sans DSN.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

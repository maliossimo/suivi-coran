// Alertes d'erreurs dans le navigateur (élèves, Cheikhs). Inactif sans DSN.
// Sentry n'est chargé que s'il est configuré : sinon, ~80 ko de moins sur chaque page.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let transition: ((href: string, type: string) => void) | undefined;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
    transition = Sentry.captureRouterTransitionStart;
  });
}

export function onRouterTransitionStart(href: string, navigationType: string) {
  transition?.(href, navigationType);
}

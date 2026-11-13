/**
 * Politique de sécurité du contenu (CSP) : le navigateur n'exécute que les scripts de
 * l'appli, marqués d'un jeton (nonce) différent à chaque page. Un script injecté par un
 * attaquant (dans un nom, une note…) est donc refusé.
 *
 * - scripts : jeton + 'strict-dynamic' (les scripts chargés par un script de confiance,
 *   comme Next ou Cloudflare Turnstile, sont admis) ;
 * - connexions : l'appli, Sentry (erreurs), Cloudflare Turnstile (anti-robots) et les repères
 *   mot par mot des récitations (jsDelivr) ;
 * - sons : l'appli et les récitations (EveryAyah, mp3quran.net) ;
 * - cadres : seulement Turnstile ; l'appli elle-même ne peut pas être affichée dans un cadre.
 */
export function politiqueContenu(nonce: string, developpement = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developpement ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    // Récitations du Coran (EveryAyah et mp3quran.net), lues directement depuis leurs serveurs.
    "media-src 'self' https://everyayah.com https://*.mp3quran.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Jeton aléatoire pour une page (128 bits, en base64). */
export function nouveauNonce(): string {
  const octets = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...octets));
}

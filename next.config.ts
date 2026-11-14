import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Version de l'appli (package.json) et commit déployé : affichés à l'ouverture et dans « Mon compte ».
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

// En-têtes de sécurité appliqués à toutes les pages.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_VERSION: version,
    NEXT_PUBLIC_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
    // Date de la mise en ligne (construction du site), affichée dans l'administration.
    NEXT_PUBLIC_MISE_EN_LIGNE: new Date().toISOString(),
  },
  reactStrictMode: true,
  // La page « Nouveautés » lit l'historique des versions sur le serveur.
  outputFileTracingIncludes: { "/admin/nouveautes": ["./CHANGELOG.md"] },
  experimental: {
    // Une page déjà vue (ex. la fiche) se rouvre instantanément pendant 30 s ;
    // tout enregistrement la rafraîchit (revalidation), elle n'est jamais périmée.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

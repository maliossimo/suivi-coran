import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les pages.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
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

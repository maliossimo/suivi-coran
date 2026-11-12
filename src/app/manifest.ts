import type { MetadataRoute } from "next";
import { envPublic } from "@/lib/env";

/** Le site s'installe sur l'écran d'accueil du téléphone et s'ouvre en plein écran, comme une appli. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Suivi cours Coran",
    short_name: "Suivi Coran",
    description: "Suivi de l'apprentissage et de la révision du Coran.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1D5C47",
    theme_color: "#1D5C47",
    // Permet au site de savoir si l'appli est déjà installée sur le téléphone (Chrome Android).
    related_applications: [
      { platform: "webapp", url: `${envPublic.NEXT_PUBLIC_SITE_URL}/manifest.webmanifest` },
    ],
    icons: [
      { src: "/icones/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

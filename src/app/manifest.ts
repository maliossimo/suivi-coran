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
    theme_color: "#174D3B",
    // Permet au site de savoir si l'appli est déjà installée sur le téléphone (Chrome Android).
    related_applications: [
      { platform: "webapp", url: `${envPublic.NEXT_PUBLIC_SITE_URL}/manifest.webmanifest` },
    ],
    // Appui long sur l'icône (Android, Chrome) : les deux gestes les plus fréquents de l'élève.
    shortcuts: [
      {
        name: "Saisir ma séance du jour",
        short_name: "Saisir ma séance",
        url: "/eleve/aujourdhui",
        icons: [{ src: "/icones/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Ma progression",
        short_name: "Progression",
        url: "/eleve/progression",
        icons: [{ src: "/icones/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      { src: "/icones/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

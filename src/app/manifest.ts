import type { MetadataRoute } from "next";

/** Le site s'installe sur l'écran d'accueil du téléphone et s'ouvre en plein écran, comme une appli. */
export default function manifest(): MetadataRoute.Manifest {
  return {
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
    icons: [
      { src: "/icones/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

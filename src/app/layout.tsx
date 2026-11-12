import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Script from "next/script";
import { BandeauNotification } from "@/components/BandeauNotification";
import { EtatReseau } from "@/components/EtatReseau";
import { OuvertureAppli } from "@/components/OuvertureAppli";
import { BandeauAnnulation } from "@/components/fiche/BandeauAnnulation";
import "./globals.css";

// Polices intégrées au site (paquets Fontsource) : le build ne dépend plus de Google Fonts.
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-texte",
  display: "swap",
});
const amiri = localFont({
  src: "../../node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff2",
  weight: "700",
  variable: "--font-arabe",
  display: "swap",
});
// Titres : une serif élégante qui s'accorde à la calligraphie arabe (Amiri).
const fraunces = localFont({
  src: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-titre",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Suivi cours Coran",
  description: "Suivi de l'apprentissage et de la révision du Coran.",
  robots: { index: false, follow: false },
  applicationName: "Suivi Coran",
  // iPhone : une fois ajouté à l'écran d'accueil, le site s'ouvre en plein écran.
  appleWebApp: {
    capable: true,
    title: "Suivi Coran",
    // La barre verte passe sous l'heure et la batterie (comme une appli native).
    statusBarStyle: "black-translucent",
    // Écran de démarrage sur iPhone (sinon blanc) : le ق sur le vert du site.
    startupImage: [
      {
        // iPhone Air
        url: "/demarrage/demarrage-1260x2736.png",
        media:
          "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1320x2868.png",
        media:
          "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1290x2796.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1206x2622.png",
        media:
          "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1179x2556.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1284x2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1125x2436.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1080x2340.png",
        media:
          "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1242x2688.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-828x1792.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-750x1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/demarrage/demarrage-1242x2208.png",
        media:
          "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#174D3B" },
    { media: "(prefers-color-scheme: dark)", color: "#0F3A2C" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Jeton CSP de la page (middleware) : nos scripts en ligne le portent pour être exécutés.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${amiri.variable} ${fraunces.variable}`}
      // Le script d'ouverture ajoute data-ouverture avant React : pas une erreur.
      suppressHydrationWarning
    >
      <body>
        <OuvertureAppli />
        {children}
        <BandeauNotification />
        <BandeauAnnulation />
        <EtatReseau />
        {/* Installation sur l'écran d'accueil : l'invitation de Chrome est gardée dès son arrivée
            (elle peut arriver avant que la page soit prête) et le service worker est enregistré. */}
        <Script id="installation-appli" strategy="beforeInteractive" nonce={nonce}>
          {`window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__invitationInstallation=e;window.dispatchEvent(new Event("installation-disponible"));});
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}
try{var appli=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;var calme=matchMedia("(prefers-reduced-motion: reduce)").matches;if(appli&&!calme&&!sessionStorage.getItem("ouverture")){sessionStorage.setItem("ouverture","1");var h=document.documentElement;h.setAttribute("data-ouverture","");var fin=function(){h.removeAttribute("data-ouverture");};setTimeout(fin,1350);addEventListener("pointerdown",fin,{once:true});}}catch(e){}`}
        </Script>
        {/* Vercel Speed Insights : vitesse réelle mesurée chez les utilisateurs (sans paquet npm). */}
        <Script id="speed-insights-file" strategy="afterInteractive" nonce={nonce}>
          {"window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };"}
        </Script>
        <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" nonce={nonce} />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { BandeauNotification } from "@/components/BandeauNotification";
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
  appleWebApp: { capable: true, title: "Suivi Coran", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1D5C47" },
    { media: "(prefers-color-scheme: dark)", color: "#0B2A20" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${amiri.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <BandeauNotification />
        <BandeauAnnulation />
        {/* Installation sur l'écran d'accueil : l'invitation de Chrome est gardée dès son arrivée
            (elle peut arriver avant que la page soit prête) et le service worker est enregistré. */}
        <Script id="installation-appli" strategy="beforeInteractive">
          {`window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__invitationInstallation=e;window.dispatchEvent(new Event("installation-disponible"));});
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}`}
        </Script>
        {/* Vercel Speed Insights : vitesse réelle mesurée chez les utilisateurs (sans paquet npm). */}
        <Script id="speed-insights-file" strategy="afterInteractive">
          {"window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };"}
        </Script>
        <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

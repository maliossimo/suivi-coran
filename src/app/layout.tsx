import type { Metadata, Viewport } from "next";
import { Amiri, Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { BandeauNotification } from "@/components/BandeauNotification";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-texte" });
const amiri = Amiri({ subsets: ["arabic"], weight: "700", variable: "--font-arabe" });
// Titres : une serif élégante qui s'accorde à la calligraphie arabe (Amiri).
const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-titre" });

export const metadata: Metadata = {
  title: "Suivi cours Coran",
  description: "Suivi de l'apprentissage et de la révision du Coran.",
  robots: { index: false, follow: false },
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
        {/* Vercel Speed Insights : vitesse réelle mesurée chez les utilisateurs (sans paquet npm). */}
        <Script id="speed-insights-file" strategy="afterInteractive">
          {"window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };"}
        </Script>
        <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

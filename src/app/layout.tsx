import type { Metadata, Viewport } from "next";
import { Amiri, Inter } from "next/font/google";
import { Suspense } from "react";
import { BandeauNotification } from "@/components/BandeauNotification";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-texte" });
const amiri = Amiri({ subsets: ["arabic"], weight: "700", variable: "--font-arabe" });

export const metadata: Metadata = {
  title: "Suivi cours Coran",
  description: "Suivi de l'apprentissage et de la révision du Coran.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1D5C47",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${amiri.variable}`}>
      <body>
        {children}
        <Suspense fallback={null}>
          <BandeauNotification />
        </Suspense>
      </body>
    </html>
  );
}

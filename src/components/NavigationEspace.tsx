"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/domain/roles";

type Icone = "fiche" | "progression" | "compte" | "classe" | "inviter" | "admin" | "journal";

interface Onglet {
  href: string;
  libelle: string;
  icone: Icone;
  /** L'onglet est allumé si le chemin courant lui appartient. */
  actif: (chemin: string) => boolean;
}

const commence = (prefixe: string) => (chemin: string) =>
  chemin === prefixe || chemin.startsWith(`${prefixe}/`);

const COMPTE: Onglet = {
  href: "/compte",
  libelle: "Mon compte",
  icone: "compte",
  actif: commence("/compte"),
};

const ONGLETS: Record<Role, Onglet[]> = {
  eleve: [
    {
      href: "/eleve",
      libelle: "Ma fiche",
      icone: "fiche",
      actif: (c) => c === "/eleve" || commence("/eleve/seance")(c),
    },
    {
      href: "/eleve/progression",
      libelle: "Progression",
      icone: "progression",
      actif: commence("/eleve/progression"),
    },
    COMPTE,
  ],
  maitre: [
    {
      href: "/maitre",
      libelle: "Ma classe",
      icone: "classe",
      actif: (c) => commence("/maitre")(c) && !commence("/maitre/inviter")(c),
    },
    { href: "/maitre/inviter", libelle: "Inviter", icone: "inviter", actif: commence("/maitre/inviter") },
    COMPTE,
  ],
  admin: [
    { href: "/admin", libelle: "Admin", icone: "admin", actif: (c) => c === "/admin" },
    { href: "/admin/journal", libelle: "Journal", icone: "journal", actif: commence("/admin/journal") },
    { href: "/maitre", libelle: "Classes", icone: "classe", actif: commence("/maitre") },
    { ...COMPTE, libelle: "Compte" },
  ],
};

const TRACES: Record<Icone, string> = {
  fiche:
    "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8h3m-3 4h6",
  progression: "M4 20V10m6 10V4m6 16v-7m4 7H3",
  compte: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  classe:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0-1.5-5.6M17 14a5 5 0 0 1 4 6",
  inviter: "M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 11-5.7M19 14v6m-3-3h6",
  admin: "M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Zm-3 9 2 2 4-4",
  journal: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
};

/**
 * Navigation principale de l'espace : barre d'onglets en bas de l'écran sur
 * téléphone, menu horizontal dans la barre du haut sur ordinateur.
 */
export function NavigationEspace({ role }: { role: Role }) {
  const chemin = usePathname();
  return (
    <nav className="nav-espace" aria-label="Navigation principale">
      {ONGLETS[role].map((o) => {
        const actif = o.actif(chemin);
        return (
          <Link key={o.href} href={o.href} className="nav-onglet" aria-current={actif ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d={TRACES[o.icone]}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{o.libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import {
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesColumn,
  ScrollText,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/domain/roles";

type Icone =
  | "fiche"
  | "progression"
  | "compte"
  | "classe"
  | "inviter"
  | "admin"
  | "journal"
  | "coran"
  | "presences"
  | "mosquee";

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
    { href: "/eleve/coran", libelle: "Coran", icone: "coran", actif: commence("/eleve/coran") },
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
    { href: "/maitre", libelle: "Élèves", icone: "classe", actif: commence("/maitre") },
    { href: "/admin/coran", libelle: "Coran", icone: "coran", actif: commence("/admin/coran") },
    { href: "/presences", libelle: "Présences", icone: "presences", actif: commence("/presences") },
    { ...COMPTE, libelle: "Compte" },
  ],
};

const ICONES: Record<Icone, LucideIcon> = {
  fiche: CalendarDays,
  progression: ChartNoAxesColumn,
  compte: UserRound,
  classe: UsersRound,
  inviter: UserPlus,
  admin: ShieldCheck,
  journal: ScrollText,
  coran: BookOpen,
  presences: CalendarCheck,
  mosquee: Building2,
};

/** Le Cheikh responsable de sa mosquée : ses élèves, sa mosquée et les présences. */
const RESPONSABLE: Onglet[] = [
  {
    href: "/maitre",
    libelle: "Élèves",
    icone: "classe",
    actif: (c) => commence("/maitre")(c) && !commence("/maitre/inviter")(c),
  },
  { href: "/maitre/inviter", libelle: "Inviter", icone: "inviter", actif: commence("/maitre/inviter") },
  { href: "/mosquee", libelle: "Mosquée", icone: "mosquee", actif: commence("/mosquee") },
  { href: "/presences", libelle: "Présences", icone: "presences", actif: commence("/presences") },
  COMPTE,
];

/**
 * Navigation principale de l'espace : barre d'onglets en bas de l'écran sur
 * téléphone, menu horizontal dans la barre du haut sur ordinateur.
 */
export function NavigationEspace({ role, responsable = false }: { role: Role; responsable?: boolean }) {
  const chemin = usePathname();
  return (
    <nav className="nav-espace" aria-label="Navigation principale">
      {(responsable ? RESPONSABLE : ONGLETS[role]).map((o) => {
        const actif = o.actif(chemin);
        const IconeOnglet = ICONES[o.icone];
        // Onglets préchargés en entier : la page s'ouvre sans attente.
        return (
          <Link
            key={o.href}
            href={o.href}
            className="nav-onglet"
            aria-current={actif ? "page" : undefined}
            prefetch
          >
            <IconeOnglet size={22} strokeWidth={1.9} aria-hidden="true" />
            <span>{o.libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

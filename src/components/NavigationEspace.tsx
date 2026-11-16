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
import { useLayoutEffect, useRef, type RefObject } from "react";
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
  const nav = useRef<HTMLElement>(null);
  const pastille = useRef<HTMLSpanElement>(null);
  usePastilleQuiGlisse(nav, pastille, chemin);
  return (
    <nav className="nav-espace" aria-label="Navigation principale" ref={nav}>
      <span className="nav-pastille" ref={pastille} aria-hidden="true" />
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

/** Position de la pastille sur la page précédente : gardée d'une page à l'autre (même session). */
let positionPrecedente: number | null = null;

/**
 * Barre du bas (téléphone) : la pastille claire de l'onglet actif glisse depuis l'onglet de la page
 * précédente jusqu'au nouvel onglet. Chaque page a sa barre : la position d'avant est gardée en mémoire.
 */
function usePastilleQuiGlisse(
  nav: RefObject<HTMLElement | null>,
  pastille: RefObject<HTMLSpanElement | null>,
  chemin: string,
) {
  useLayoutEffect(() => {
    const barre = nav.current;
    const p = pastille.current;
    if (!barre || !p) return;
    const actif = barre.querySelector<HTMLElement>('.nav-onglet[aria-current="page"]');
    if (!actif) {
      barre.classList.remove("avec-pastille");
      return;
    }
    // D'abord la classe (les onglets deviennent des repères de position), puis les mesures.
    barre.classList.add("avec-pastille");
    const position = actif.offsetLeft + actif.offsetWidth / 2;
    // Hauteur : juste au-dessus du libellé (icône de 22 px + 2 px de marge, 3 px d'écart), comme avant.
    const libelle = actif.querySelector<HTMLElement>("span");
    if (libelle) p.style.setProperty("--pastille-y", `${actif.offsetTop + libelle.offsetTop - 3 - 26}px`);
    const placer = (x: number) => p.style.setProperty("--pastille-x", `${x}px`);
    if (positionPrecedente === null || positionPrecedente === position) {
      p.classList.remove("glisse");
      placer(position);
    } else {
      // Départ à l'ancienne place, sans transition ; arrivée à la nouvelle, en glissant.
      p.classList.remove("glisse");
      placer(positionPrecedente);
      void p.offsetWidth;
      p.classList.add("glisse");
      placer(position);
    }
    positionPrecedente = position;
  }, [nav, pastille, chemin]);
}

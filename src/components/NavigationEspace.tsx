"use client";

import { ScrollText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ComponentType, type RefObject } from "react";
import {
  IconeClasse,
  IconeCompte,
  IconeCoran,
  IconeFiche,
  IconeInviter,
  IconeMosquee,
  IconePresences,
  IconeProgression,
} from "./IconesNav";
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

type IconeComposant = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: "true" }>;

const ICONES: Record<Icone, IconeComposant> = {
  fiche: IconeFiche,
  progression: IconeProgression,
  compte: IconeCompte,
  classe: IconeClasse,
  inviter: IconeInviter,
  admin: ShieldCheck,
  journal: ScrollText,
  coran: IconeCoran,
  presences: IconePresences,
  mosquee: IconeMosquee,
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
  useArriveeDansLeSens(chemin);
  const onglets = responsable ? RESPONSABLE : ONGLETS[role];
  const indexActif = onglets.findIndex((o) => o.actif(chemin));
  return (
    <nav className="nav-espace" aria-label="Navigation principale" ref={nav}>
      <span className="nav-pastille" ref={pastille} aria-hidden="true" />
      {onglets.map((o, index) => {
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
            onClick={() => {
              // La page suivante arrive du côté de l'onglet touché.
              sensOnglet = actif || indexActif < 0 ? null : index > indexActif ? "droite" : "gauche";
            }}
          >
            <IconeOnglet size={22} strokeWidth={1.9} aria-hidden="true" />
            <span>{o.libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Côté d'où arrive la page ouverte depuis la barre (null : pas d'onglet touché). */
let sensOnglet: "gauche" | "droite" | null = null;

/**
 * Onglet du bas touché : le contenu de la nouvelle page glisse depuis le côté de l'onglet
 * (vers la droite de la barre → depuis la droite). Animation faite en script : elle ne laisse
 * aucune trace dans la feuille de style (rien ne se relance ensuite). Rien si le téléphone
 * demande de réduire les animations.
 */
function useArriveeDansLeSens(chemin: string) {
  useLayoutEffect(() => {
    const sens = sensOnglet;
    sensOnglet = null;
    if (!sens || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const depart = sens === "droite" ? "28px" : "-28px";
    for (const el of document.querySelectorAll<HTMLElement>("main.espace > *")) {
      el.animate?.(
        [
          { transform: `translateX(${depart})`, opacity: 0.001 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
  }, [chemin]);
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

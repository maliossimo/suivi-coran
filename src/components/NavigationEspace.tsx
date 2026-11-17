"use client";

import { Ellipsis, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type RefObject,
} from "react";
import { Feuille } from "./Feuille";
import { CHOIX, useChoix } from "./RetenirChoix";
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
import { titreArabe } from "@/domain/ciel";
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
  | "mosquee"
  | "nouveautes";

interface Onglet {
  href: string;
  libelle: string;
  icone: Icone;
  /** L'onglet est allumé si le chemin courant lui appartient. */
  actif: (chemin: string) => boolean;
  /** Téléphone : rangé dans « Plus » (barre du bas moins chargée). */
  secondaire?: boolean;
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
    // « Mon compte » : l'avatar en haut à droite (la barre garde trois onglets, le Coran au centre).
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
    { href: "/maitre", libelle: "Élèves", icone: "classe", actif: commence("/maitre") },
    { href: "/admin/coran", libelle: "Coran", icone: "coran", actif: commence("/admin/coran") },
    { href: "/presences", libelle: "Présences", icone: "presences", actif: commence("/presences") },
    {
      href: "/admin/journal",
      libelle: "Journal",
      icone: "journal",
      actif: commence("/admin/journal"),
      secondaire: true,
    },
    {
      href: "/admin/nouveautes",
      libelle: "Nouveautés",
      icone: "nouveautes",
      actif: commence("/admin/nouveautes"),
      secondaire: true,
    },
    { ...COMPTE, libelle: "Compte", secondaire: true },
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
  nouveautes: Sparkles,
};

/** Nom arabe court d'un onglet (sous le nom français, sur téléphone). */
function arabeOnglet(libelle: string): string {
  return libelle === "Coran" ? "القرآن" : (titreArabe(libelle) ?? "");
}

/**
 * Barre du téléphone : le Coran (sinon la page d'accueil du rôle) devient le mihrab, au centre de la barre
 * quand le nombre de places est impair (« Plus » compte pour une place).
 */
function disposer(onglets: Onglet[], avecPlus: boolean): { principaux: Onglet[]; mihrab: Onglet | null } {
  const places = onglets.length + (avecPlus ? 1 : 0);
  const mihrab = onglets.find((o) => o.icone === "coran") ?? onglets[0] ?? null;
  if (!mihrab || places < 3 || places % 2 === 0) return { principaux: onglets, mihrab: null };
  const autres = onglets.filter((o) => o !== mihrab);
  autres.splice(Math.floor(places / 2), 0, mihrab);
  return { principaux: autres, mihrab };
}

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
  // Choix retenus : « Ma fiche » rouvre l'onglet choisi la dernière fois, « Ma classe » la classe choisie.
  const ongletFiche = useChoix(CHOIX.ongletFiche);
  const classeCheikh = useChoix(CHOIX.classeCheikh);
  const adresse = (href: string) =>
    href === "/eleve" && ongletFiche === "revision"
      ? "/eleve?type=revision"
      : href === "/maitre" && classeCheikh && /^[0-9a-f-]{36}$/i.test(classeCheikh)
        ? `/maitre?groupe=${classeCheikh}`
        : href;
  const secondaires = onglets.filter((o) => o.secondaire);
  // Ordre de l'ordinateur inchangé ; sur téléphone, le mihrab passe au centre (propriété CSS « order »).
  const principaux = onglets.filter((o) => !o.secondaire);
  const { principaux: surTelephone, mihrab } = disposer(principaux, secondaires.length > 0);
  // Position sur la barre du téléphone : un onglet rangé dans « Plus » est à la place de « Plus ».
  const position = (o: Onglet) => (o.secondaire ? principaux.length : surTelephone.indexOf(o));
  const ongletActif = onglets.find((o) => o.actif(chemin));
  const indexActif = ongletActif ? position(ongletActif) : -1;
  const plusActif = Boolean(ongletActif?.secondaire);
  return (
    <nav className="nav-espace" aria-label="Navigation principale" ref={nav}>
      <span className="nav-pastille" ref={pastille} aria-hidden="true" />
      {[...principaux, ...secondaires].map((o) => {
        const actif = o.actif(chemin);
        const index = position(o);
        const IconeOnglet = ICONES[o.icone];
        // Onglets préchargés en entier : la page s'ouvre sans attente.
        return (
          <Link
            key={o.href}
            href={adresse(o.href)}
            className={
              o.secondaire
                ? "nav-onglet nav-secondaire"
                : o === mihrab
                  ? "nav-onglet nav-mihrab"
                  : "nav-onglet"
            }
            aria-current={actif ? "page" : undefined}
            style={o.secondaire ? undefined : ({ "--ordre": index } as CSSProperties)}
            prefetch
            onClick={() => {
              // La page suivante arrive du côté de l'onglet touché.
              sensOnglet = actif || indexActif < 0 ? null : index > indexActif ? "droite" : "gauche";
            }}
          >
            <IconeOnglet size={22} strokeWidth={1.9} aria-hidden="true" />
            <span>{o.libelle}</span>
            <small className="nav-ar" lang="ar" aria-hidden="true">
              {arabeOnglet(o.libelle)}
            </small>
          </Link>
        );
      })}
      {secondaires.length ? (
        <MenuPlus
          onglets={secondaires}
          actif={plusActif}
          chemin={chemin}
          surChoix={(o) => {
            sensOnglet = o.actif(chemin) || indexActif < 0 || plusActif ? null : "droite";
          }}
        />
      ) : null}
    </nav>
  );
}

/**
 * Téléphone : « Plus » regroupe les onglets moins utilisés dans une feuille du bas
 * (la barre garde de la place pour des libellés lisibles). Sur ordinateur, ils sont dans le menu du haut.
 */
function MenuPlus({
  onglets,
  actif,
  chemin,
  surChoix,
}: {
  onglets: Onglet[];
  actif: boolean;
  chemin: string;
  surChoix: (o: Onglet) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        className="nav-onglet nav-plus"
        data-actif={actif ? "" : undefined}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        onClick={() => setOuvert(true)}
      >
        <Ellipsis size={22} strokeWidth={1.9} aria-hidden="true" />
        <span>Plus</span>
        <small className="nav-ar" lang="ar" aria-hidden="true">
          المزيد
        </small>
      </button>
      <Feuille ouverte={ouvert} onFermer={() => setOuvert(false)} titre="Plus">
        <ul className="menu-plus-nav">
          {onglets.map((o) => {
            const IconeOnglet = ICONES[o.icone];
            const courant = o.actif(chemin);
            return (
              <li key={o.href}>
                <Link
                  href={o.href}
                  prefetch
                  aria-current={courant ? "page" : undefined}
                  onClick={() => {
                    surChoix(o);
                    setOuvert(false);
                  }}
                >
                  <IconeOnglet size={20} strokeWidth={2} aria-hidden="true" />
                  {o.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </Feuille>
    </>
  );
}

/** Éléments accrochés à l'écran (position fixe ou collante) : leur bloc ne glisse pas. */
const ACCROCHES =
  ".coran-lecteur, .coran-vue-page, .coran-sortir-plein-ecran, .barre-enregistrer, .feuille-appel-resume, [data-accroche]";

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
    // Repère le temps de l'arrivée : le lecteur du Coran monte depuis le bas (voir globals.css).
    const html = document.documentElement;
    html.dataset.arriveeOnglet = sens;
    const fin = window.setTimeout(() => delete html.dataset.arriveeOnglet, 1500);
    const depart = sens === "droite" ? "28px" : "-28px";
    for (const el of document.querySelectorAll<HTMLElement>("main.espace > *")) {
      // Un bloc qui porte un élément accroché à l'écran (lecteur du Coran, barre d'enregistrement…) ne glisse
      // pas : déplacé, il emmènerait cet élément avec lui, qui sauterait ensuite.
      // (Pas de fondu non plus : une page claire à demi transparente paraissait grisée, comme en chargement.
      // Elle s'affiche net, et c'est le lecteur qui monte depuis le bas.)
      if (el.matches(ACCROCHES) || el.querySelector(ACCROCHES) !== null) continue;
      el.animate?.(
        [
          { transform: `translateX(${depart})`, opacity: 0.001 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
    return () => {
      window.clearTimeout(fin);
      delete html.dataset.arriveeOnglet;
    };
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
    // (Sur téléphone, un onglet rangé dans « Plus » est représenté par le bouton « Plus ».)
    const actif = [
      ...barre.querySelectorAll<HTMLElement>('.nav-onglet[aria-current="page"], .nav-plus[data-actif]'),
    ].find((el) => el.offsetParent !== null);
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

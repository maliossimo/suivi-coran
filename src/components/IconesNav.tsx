import type { ReactNode, SVGProps } from "react";

/**
 * Icônes dessinées pour la barre de navigation (même trait que les icônes Lucide).
 * Les formes sans `fill="none"` se remplissent légèrement quand l'onglet est actif
 * (règle `.nav-onglet[aria-current="page"] svg` de globals.css).
 */
type Props = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Icone({ size = 24, strokeWidth = 1.9, children, ...reste }: Props & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...reste}
    >
      {children}
    </svg>
  );
}

/** Ma fiche : un carnet à spirale, ses lignes et une coche. */
export function IconeFiche(props: Props) {
  return (
    <Icone {...props}>
      <rect x="5" y="3" width="15" height="18" rx="2.5" />
      <path d="M3 7.5h3M3 12h3M3 16.5h3" fill="none" />
      <path d="M9.5 8.5h6M9.5 12.5h4" fill="none" />
      <path d="m10 16.6 1.6 1.4 3.2-3.2" fill="none" />
    </Icone>
  );
}

/** Coran : le mushaf ouvert posé sur son pupitre (rahl). */
export function IconeCoran(props: Props) {
  return (
    <Icone {...props}>
      <path d="M12 5.2C10 3.8 7 3.4 3.5 3.8v10.4c3.5-.4 6.5 0 8.5 1.4 2-1.4 5-1.8 8.5-1.4V3.8C17 3.4 14 3.8 12 5.2Z" />
      <path d="M12 5.2v10.4" fill="none" />
      <path d="m7 16.4 10 4.6M17 16.4 7 21" fill="none" />
    </Icone>
  );
}

/** Progression : trois barres qui montent, et une étoile au sommet. */
export function IconeProgression(props: Props) {
  return (
    <Icone {...props}>
      <path d="M3.5 20.5h17" fill="none" />
      <rect x="5" y="13.5" width="3.4" height="7" rx="1.2" />
      <rect x="10.3" y="10" width="3.4" height="10.5" rx="1.2" />
      <rect x="15.6" y="7.5" width="3.4" height="13" rx="1.2" />
      <path d="m17.3 1.8.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7Z" strokeWidth={1.4} />
    </Icone>
  );
}

/** Mon compte : une personne. */
export function IconeCompte(props: Props) {
  return (
    <Icone {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.9-4 3.9-6.2 7.5-6.2s6.6 2.2 7.5 6.2Z" />
    </Icone>
  );
}

/** Ma classe : deux élèves côte à côte. */
export function IconeClasse(props: Props) {
  return (
    <Icone {...props}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5Z" />
      <path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.4 4 5.2" fill="none" />
    </Icone>
  );
}

/** Inviter : une personne et un « + ». */
export function IconeInviter(props: Props) {
  return (
    <Icone {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20.5c.8-4 3.6-6.2 7-6.2s6.2 2.2 7 6.2Z" />
      <path d="M19 6.5v6M16 9.5h6" fill="none" />
    </Icone>
  );
}

/** Présences : un calendrier coché. */
export function IconePresences(props: Props) {
  return (
    <Icone {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" fill="none" />
      <path d="m9 15 2 2 4-4" fill="none" />
    </Icone>
  );
}

/** Mosquée : la coupole, sa porte et le minaret. */
export function IconeMosquee(props: Props) {
  return (
    <Icone {...props}>
      <path d="M5 20.5V15a6 6 0 0 1 12 0v5.5Z" />
      <path d="M11 6.2V9M11 4.4h.01" fill="none" />
      <path d="M9.5 20.5v-2.6a1.5 1.5 0 0 1 3 0v2.6" fill="none" />
      <path d="M20.5 20.5V10M19.3 10h2.4M20.5 10V7.6" fill="none" />
      <path d="M2.5 20.5h19" fill="none" />
    </Icone>
  );
}

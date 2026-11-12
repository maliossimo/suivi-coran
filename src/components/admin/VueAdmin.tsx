import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * L'admin regarde l'espace d'un Cheikh : bandeau d'explication, et tout le contenu
 * en lecture seule (un <fieldset disabled> désactive boutons et champs ; les liens restent).
 */
export function VueAdmin({
  actif,
  classe,
  children,
}: {
  actif: boolean;
  classe?: string;
  children: ReactNode;
}) {
  if (!actif) return <>{children}</>;
  return (
    <>
      <p className="bandeau-vue-admin" role="status">
        <Eye size={16} aria-hidden="true" />
        <span>
          Vue du Cheikh{classe ? ` · ${classe}` : ""} · <b>lecture seule</b>
        </span>
        <Link href="/admin">Administration</Link>
      </p>
      <fieldset disabled className="lecture-seule">
        {children}
      </fieldset>
    </>
  );
}

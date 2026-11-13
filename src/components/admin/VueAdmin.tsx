import { Eye, PencilLine } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { actionModeVueAdmin } from "@/app/actions/admin";
import { modeVueAdmin } from "@/services/vueAdmin";

/**
 * L'admin regarde l'espace d'un Cheikh. Deux modes, au choix dans le bandeau :
 * - lecture seule (par défaut) : un <fieldset disabled> désactive boutons et champs, les liens restent ;
 * - modification : tout fonctionne comme pour le Cheikh (les changements sont notés à son nom dans le journal).
 */
export async function VueAdmin({
  actif,
  classe,
  children,
}: {
  actif: boolean;
  classe?: string;
  children: ReactNode;
}) {
  if (!actif) return <>{children}</>;
  const mode = await modeVueAdmin();
  const modification = mode === "modification";

  return (
    <>
      <div className={modification ? "bandeau-vue-admin modification" : "bandeau-vue-admin"} role="status">
        <p>
          {modification ? <PencilLine size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span>Vue du Cheikh{classe ? ` · ${classe}` : ""}</span>
          <Link href="/admin">Administration</Link>
        </p>
        <form action={actionModeVueAdmin} className="choix-mode-admin" aria-label="Mode">
          <button type="submit" name="mode" value="lecture" aria-pressed={!modification}>
            Lecture seule
          </button>
          <button type="submit" name="mode" value="modification" aria-pressed={modification}>
            Modifier
          </button>
        </form>
      </div>
      {modification ? (
        children
      ) : (
        <fieldset disabled className="lecture-seule">
          {children}
        </fieldset>
      )}
    </>
  );
}

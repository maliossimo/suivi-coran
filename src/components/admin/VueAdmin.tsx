import type { ReactNode } from "react";
import { modeVueAdmin } from "@/services/vueAdmin";
import { ZoneVueAdmin } from "./ZoneVueAdmin";

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
  return (
    <ZoneVueAdmin modificationInitiale={mode === "modification"} classe={classe}>
      {children}
    </ZoneVueAdmin>
  );
}

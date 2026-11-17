"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/** Réglage du lecteur du Coran (même clé que LectureCoran) : « mots à revoir » coupé ? */
function coupe(): boolean {
  try {
    const r = JSON.parse(localStorage.getItem("coran-reglages") ?? "{}") as { soulignerARevoir?: unknown };
    return r.soulignerARevoir === false;
  } catch {
    return false;
  }
}

/** N'affiche son contenu que si l'élève n'a pas coupé les mots à revoir sur cet appareil. */
export function SiMotsARevoir({ children }: { children: ReactNode }) {
  const masque = useSyncExternalStore(
    () => () => undefined,
    coupe,
    () => false,
  );
  return masque ? null : <>{children}</>;
}

"use client";

import { WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EVENEMENT_ENREGISTREE } from "./fiche/enregistrementsEnAttente";

/**
 * Sans réseau : un bandeau rassure (on peut continuer, rien n'est perdu).
 * Quand une séance en attente finit par partir, la page se met à jour.
 */
export function EtatReseau() {
  const router = useRouter();
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    const rafraichir = () => router.refresh();
    window.addEventListener(EVENEMENT_ENREGISTREE, rafraichir);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
      window.removeEventListener(EVENEMENT_ENREGISTREE, rafraichir);
    };
  }, [router]);

  if (!horsLigne) return null;
  return (
    <div className="bandeau-hors-ligne" role="status">
      <WifiOff size={16} aria-hidden="true" />
      <span>Pas de réseau : continue, tes séances partiront toutes seules au retour de la connexion.</span>
    </div>
  );
}

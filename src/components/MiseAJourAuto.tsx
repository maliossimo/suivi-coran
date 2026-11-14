"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { nouvelleVersion } from "@/domain/miseAJour";
import { COMMIT } from "@/lib/version";

/** Vérification régulière, en plus du retour sur l'appli et du retour du réseau. */
const INTERVALLE = 10 * 60 * 1000;
const CLE_TENTATIVE = "mise-a-jour-tentee";

async function versionEnLigne(): Promise<string | null> {
  try {
    const r = await fetch("/api/version", { cache: "no-store" });
    if (!r.ok) return null;
    const { commit } = (await r.json()) as { commit: string | null };
    return commit;
  } catch {
    return null;
  }
}

/**
 * Met l'appli à jour toute seule après une mise en ligne, sans jamais couper ce qu'on fait :
 * la nouvelle version est préparée en arrière-plan (service worker), puis appliquée
 * - à la prochaine ouverture : retour sur l'appli après au moins une minute ailleurs ;
 * - ou en touchant un lien : la page suivante s'ouvre directement dans la nouvelle version.
 * Jamais pendant qu'on lit, récite ou saisit. Les saisies en cours sont de toute façon gardées en brouillon.
 */
export function MiseAJourAuto() {
  /** Numéro de la version en ligne, quand elle diffère de celle de l'appli ouverte. */
  const [enAttente, setEnAttente] = useState<string | null>(null);
  const [recharge, setRecharge] = useState(false);
  /** Depuis quand l'appli est en arrière-plan (null : au premier plan). */
  const cacheeDepuis = useRef<number | null>(null);

  // Recherche d'une nouvelle version.
  useEffect(() => {
    if (!COMMIT) return; // développement et tests : pas de numéro de déploiement
    const verifier = async () => {
      if (!navigator.onLine) return;
      const enLigne = await versionEnLigne();
      if (!nouvelleVersion(COMMIT, enLigne)) return;
      // Une seule tentative par version (si le serveur annonçait trop tôt la nouvelle).
      try {
        if (sessionStorage.getItem(CLE_TENTATIVE) === enLigne) return;
      } catch {
        // stockage indisponible
      }
      void navigator.serviceWorker?.getRegistration().then((r) => r?.update());
      setEnAttente(enLigne);
    };
    const premier = setTimeout(verifier, 5_000);
    const regulier = setInterval(verifier, INTERVALLE);
    const auRetour = () => {
      if (document.visibilityState === "visible") void verifier();
    };
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener("online", verifier);
    return () => {
      clearTimeout(premier);
      clearInterval(regulier);
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("online", verifier);
    };
  }, []);

  // Rechargement au bon moment.
  useEffect(() => {
    if (!enAttente) return;
    const recharger = () => {
      try {
        sessionStorage.setItem(CLE_TENTATIVE, enAttente);
      } catch {
        // stockage indisponible
      }
      setRecharge(true);
      setTimeout(() => window.location.reload(), 600);
    };

    const sonEnCours = () => [...document.querySelectorAll("audio")].some((a) => !a.paused);

    // 1. Prochaine ouverture : l'appli revient au premier plan après au moins une minute ailleurs.
    const auRetour = () => {
      if (document.visibilityState === "hidden") {
        cacheeDepuis.current = Date.now();
        return;
      }
      const absence = cacheeDepuis.current ? Date.now() - cacheeDepuis.current : 0;
      cacheeDepuis.current = null;
      if (absence >= 60_000 && !sonEnCours()) recharger();
    };
    // 2. Un lien interne touché : on l'ouvre en vrai chargement, donc dans la nouvelle version.
    const surLien = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (!(lien instanceof HTMLAnchorElement) || lien.target || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin || sonEnCours()) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        sessionStorage.setItem(CLE_TENTATIVE, enAttente);
      } catch {
        // stockage indisponible
      }
      setRecharge(true);
      window.location.assign(url.href);
    };
    document.addEventListener("visibilitychange", auRetour);
    document.addEventListener("click", surLien, true);
    return () => {
      document.removeEventListener("visibilitychange", auRetour);
      document.removeEventListener("click", surLien, true);
    };
  }, [enAttente]);

  return recharge ? (
    <div className="mise-a-jour" role="status">
      <RefreshCw size={16} aria-hidden="true" />
      Nouvelle version : mise à jour…
    </div>
  ) : null;
}

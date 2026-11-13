"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { nouvelleVersion, rechargementSansGene } from "@/domain/miseAJour";
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
 * Met l'appli à jour toute seule après une mise en ligne, sans qu'on ait à la fermer :
 * - en revenant sur l'appli (elle était en arrière-plan) : rechargement immédiat ;
 * - en touchant un lien : la page suivante s'ouvre directement dans la nouvelle version ;
 * - appli ouverte sans être touchée depuis 20 s, sans saisie, son ni feuille ouverte.
 * Les saisies en cours sont gardées en brouillon par ailleurs ; rien n'est perdu.
 */
export function MiseAJourAuto() {
  /** Numéro de la version en ligne, quand elle diffère de celle de l'appli ouverte. */
  const [enAttente, setEnAttente] = useState<string | null>(null);
  const [recharge, setRecharge] = useState(false);
  const dernierGeste = useRef(Date.now());

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

    const geste = () => {
      dernierGeste.current = Date.now();
    };
    const etat = () => {
      const actif = document.activeElement;
      return {
        visible: document.visibilityState === "visible",
        feuilleOuverte: Boolean(document.querySelector("dialog[open]")),
        sonEnCours: [...document.querySelectorAll("audio")].some((a) => !a.paused),
        saisieEnCours:
          actif instanceof HTMLInputElement ||
          actif instanceof HTMLTextAreaElement ||
          actif instanceof HTMLSelectElement ||
          (actif instanceof HTMLElement && actif.isContentEditable),
        inactifDepuis: Date.now() - dernierGeste.current,
      };
    };

    // 1. Retour sur l'appli : rien n'est en cours, on recharge tout de suite.
    const auRetour = () => {
      if (document.visibilityState === "visible" && !etat().sonEnCours) recharger();
    };
    // 2. Un lien interne touché : on l'ouvre en vrai chargement, donc dans la nouvelle version.
    const surLien = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (!(lien instanceof HTMLAnchorElement) || lien.target || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin || etat().sonEnCours) return;
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
    // 3. Appli ouverte mais au repos.
    const auRepos = setInterval(() => {
      if (rechargementSansGene(etat())) recharger();
    }, 5_000);

    for (const t of ["pointerdown", "keydown", "scroll"] as const)
      window.addEventListener(t, geste, { passive: true, capture: true });
    document.addEventListener("visibilitychange", auRetour);
    document.addEventListener("click", surLien, true);
    return () => {
      clearInterval(auRepos);
      for (const t of ["pointerdown", "keydown", "scroll"] as const)
        window.removeEventListener(t, geste, { capture: true });
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

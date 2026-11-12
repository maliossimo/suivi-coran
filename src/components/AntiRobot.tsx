"use client";

import { useEffect, useRef } from "react";

const CLE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let chargement: Promise<void> | null = null;
function chargerTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  chargement ??= new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      chargement = null;
      ko(new Error("Turnstile indisponible"));
    };
    document.head.appendChild(s);
  });
  return chargement;
}

/**
 * Vérification anti-robots (Cloudflare Turnstile) dans un formulaire de connexion,
 * de mot de passe oublié ou d'inscription : invisible pour une personne, elle ne
 * s'affiche qu'en cas de doute. Le jeton part avec le formulaire (champ
 * « cf-turnstile-response ») et Supabase le vérifie.
 * Sans clé configurée (NEXT_PUBLIC_TURNSTILE_SITE_KEY), rien n'est affiché.
 */
export function AntiRobot() {
  const zone = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!CLE || !zone.current) return;
    let id: string | undefined;
    let annule = false;
    chargerTurnstile()
      .then(() => {
        if (annule || !zone.current || !window.turnstile) return;
        id = window.turnstile.render(zone.current, {
          sitekey: CLE,
          language: "fr",
          appearance: "interaction-only",
          "refresh-expired": "auto",
        });
      })
      .catch(() => {
        /* sans Turnstile, Supabase refusera : le message d'erreur du formulaire s'affiche */
      });
    return () => {
      annule = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);
  if (!CLE) return null;
  return <div ref={zone} className="anti-robot" />;
}

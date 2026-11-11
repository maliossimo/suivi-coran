"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NOM_COOKIE_NOTIFICATION, type Notification } from "./notification-commun";

const DUREE_MS = 3200;

function lireEtEffacer(): Notification | null {
  const brut = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${NOM_COOKIE_NOTIFICATION}=`))
    ?.slice(NOM_COOKIE_NOTIFICATION.length + 1);
  if (!brut) return null;
  document.cookie = `${NOM_COOKIE_NOTIFICATION}=; path=/; max-age=0`;
  try {
    const valeur = JSON.parse(decodeURIComponent(brut)) as Partial<Notification>;
    if (typeof valeur.message !== "string") return null;
    return {
      message: valeur.message.slice(0, 160),
      genre: valeur.genre === "erreur" ? "erreur" : "succes",
      id: Number(valeur.id) || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Bandeau « ✓ Séance enregistrée » en bas de l'écran, qui disparaît tout seul.
 * Les actions serveur déposent le message dans un cookie (voir notifier()) ;
 * on le relève à chaque navigation et régulièrement (actions sans changement d'adresse).
 */
export function BandeauNotification() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const chemin = usePathname();
  const recherche = useSearchParams();

  const relever = useCallback(() => {
    const nouvelle = lireEtEffacer();
    if (nouvelle) setNotification(nouvelle);
  }, []);

  useEffect(relever, [chemin, recherche, relever]);

  useEffect(() => {
    const minuterie = window.setInterval(relever, 400);
    return () => window.clearInterval(minuterie);
  }, [relever]);

  useEffect(() => {
    if (!notification) return;
    const minuterie = window.setTimeout(() => setNotification(null), DUREE_MS);
    return () => window.clearTimeout(minuterie);
  }, [notification]);

  return (
    <div className="zone-notification" aria-live="polite" role="status">
      {notification ? (
        <div key={notification.id} className={`notification notification-${notification.genre}`}>
          <span className="notification-icone" aria-hidden="true">
            {notification.genre === "succes" ? "✓" : "!"}
          </span>
          <span>{notification.message}</span>
          <button
            type="button"
            className="notification-fermer"
            onClick={() => setNotification(null)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

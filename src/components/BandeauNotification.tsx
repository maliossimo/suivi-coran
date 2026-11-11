"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { NOM_COOKIE_NOTIFICATION, type Notification } from "./notification-commun";

const DUREE_MS = 3200;

// Le message vit hors de React : un rafraîchissement de la page juste après
// l'enregistrement (revalidation) ne doit pas l'effacer avant qu'on le voie.
let courante: Notification | null = null;
const abonnes = new Set<() => void>();
let minuterie: number | undefined;
let veilleDemarree = false;

function publier(notification: Notification | null) {
  courante = notification;
  abonnes.forEach((f) => f());
  window.clearTimeout(minuterie);
  if (notification) minuterie = window.setTimeout(() => publier(null), DUREE_MS);
}

function lireEtEffacer(): Notification | null {
  const brut = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${NOM_COOKIE_NOTIFICATION}=`))
    ?.slice(NOM_COOKIE_NOTIFICATION.length + 1);
  if (!brut) return null;
  document.cookie = `${NOM_COOKIE_NOTIFICATION}=; path=/; max-age=0`;
  try {
    // Décode jusqu'à retrouver le JSON (la valeur peut être encodée une ou deux fois).
    let texte = brut;
    for (let i = 0; i < 3 && !texte.startsWith("{"); i++) texte = decodeURIComponent(texte);
    const valeur = JSON.parse(texte) as Partial<Notification>;
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

function relever() {
  const nouvelle = lireEtEffacer();
  if (nouvelle) publier(nouvelle);
}

/** Une seule veille pour toute l'application (actions sans changement d'adresse). */
function demarrerVeille() {
  if (veilleDemarree) return;
  veilleDemarree = true;
  window.setInterval(relever, 250);
}

function sAbonner(f: () => void) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/**
 * Bandeau « ✓ Séance enregistrée » en bas de l'écran, qui disparaît tout seul.
 * Les actions serveur déposent le message dans un cookie (voir notifier()) ;
 * on le relève à chaque navigation et en continu.
 */
export function BandeauNotification() {
  const notification = useSyncExternalStore(
    sAbonner,
    () => courante,
    () => null,
  );
  const chemin = usePathname();

  useEffect(() => {
    demarrerVeille();
    relever();
  }, [chemin]);

  return (
    <div className="zone-notification" aria-live="polite" role="status">
      {notification ? (
        <div key={notification.id} className={`notification notification-${notification.genre}`}>
          <span className="notification-icone" aria-hidden="true">
            {notification.genre === "succes" ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          </span>
          <span>{notification.message}</span>
          <button
            type="button"
            className="notification-fermer"
            onClick={() => publier(null)}
            aria-label="Fermer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { actionEnregistrerAppel } from "@/app/actions/presences";
import type { StatutPresence } from "@/domain/presences";

/**
 * Appels faits sans réseau : gardés dans le téléphone, envoyés dès que possible.
 * Un appel est rejouable (la base remplace l'appel du même jour) : renvoyer ne crée pas de doublon.
 */
export interface AppelLocal {
  classe: string;
  date: string;
  presences: { membre: string; statut: StatutPresence; note: string | null }[];
  garde: string;
}

const CLE = "appels-en-attente";

export function appelsEnAttente(): AppelLocal[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? "[]") as AppelLocal[];
  } catch {
    return [];
  }
}

function ecrire(liste: AppelLocal[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // stockage plein ou indisponible
  }
  window.dispatchEvent(new Event("appels-en-attente"));
}

function garder(appel: AppelLocal) {
  ecrire([...appelsEnAttente().filter((a) => !(a.classe === appel.classe && a.date === appel.date)), appel]);
}

function oublier(appel: Pick<AppelLocal, "classe" | "date">) {
  ecrire(appelsEnAttente().filter((a) => !(a.classe === appel.classe && a.date === appel.date)));
}

/** Envoie l'appel ; sans réseau, il est gardé et partira plus tard. */
export async function envoyerAppel(
  appel: Omit<AppelLocal, "garde">,
): Promise<"envoye" | "garde" | { erreur: string }> {
  const local = { ...appel, garde: new Date().toISOString() };
  if (!navigator.onLine) {
    garder(local);
    return "garde";
  }
  try {
    const r = await actionEnregistrerAppel(appel);
    if (r.ok) {
      oublier(appel);
      return "envoye";
    }
    return { erreur: r.erreur ?? "L’appel n’a pas pu être enregistré." };
  } catch {
    // Réseau coupé pendant l'envoi.
    garder(local);
    return "garde";
  }
}

/** Renvoie les appels gardés (au retour du réseau, à l'ouverture d'une page). */
export async function relancerAppels(): Promise<number> {
  if (!navigator.onLine) return 0;
  let envoyes = 0;
  for (const a of appelsEnAttente()) {
    try {
      const r = await actionEnregistrerAppel({ classe: a.classe, date: a.date, presences: a.presences });
      // Refusé par le serveur (droits, date) : inutile de le renvoyer indéfiniment.
      oublier(a);
      if (r.ok) envoyes++;
    } catch {
      break;
    }
  }
  return envoyes;
}

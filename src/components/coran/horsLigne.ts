"use client";

import { useCallback, useEffect, useState } from "react";
import { fichierVerset, type Piste } from "@/domain/coran";

/**
 * Coran hors ligne (côté téléphone). Le service worker (public/sw.js) sert ensuite :
 * - les sourates préparées (texte) depuis le cache « suivi-coran-texte » ;
 * - les récitations téléchargées depuis /coran-hors-ligne/… (cache « suivi-coran-audio »).
 */
const AUDIO = "suivi-coran-audio-v1";
const PREFIXE = "/coran-hors-ligne";
const EN_PARALLELE = 4;

export const adresseAudio = (dossier: string, fichier: string) => `${PREFIXE}/audio/${dossier}/${fichier}`;
export const adresseMots = (alignement: string, sourate: number, ayah: number) =>
  `${PREFIXE}/mots/${alignement}/${sourate}/${ayah}.json`;

export const horsLignePossible = () =>
  typeof window !== "undefined" && "caches" in window && Boolean(navigator.serviceWorker?.controller);

async function enParallele<T>(elements: readonly T[], tache: (e: T) => Promise<void>, progres: () => void) {
  let i = 0;
  const travailleur = async () => {
    while (i < elements.length) {
      const e = elements[i++]!;
      await tache(e);
      progres();
    }
  };
  await Promise.all(Array.from({ length: Math.min(EN_PARALLELE, elements.length) }, travailleur));
}

/** Fichiers déjà téléchargés pour un récitateur (noms « SSSAAA.mp3 »). */
async function fichiersTelecharges(dossier: string): Promise<Set<string>> {
  const cache = await caches.open(AUDIO);
  const prefixe = `${PREFIXE}/audio/${dossier}/`;
  const cles = await cache.keys();
  return new Set(
    cles
      .map((r) => new URL(r.url).pathname)
      .filter((p) => p.startsWith(prefixe))
      .map((p) => p.slice(prefixe.length)),
  );
}

export interface EtatHorsLigne {
  possible: boolean;
  /** Fichiers de ce récitateur gardés sur le téléphone. */
  telecharges: Set<string>;
  /** Téléchargement ou préparation en cours. */
  progres: { fait: number; total: number; quoi: "sourate" | "texte" } | null;
  erreur: string | null;
  /** Place occupée par l'appli sur le téléphone (octets). */
  place: number | null;
  texteGarde: boolean;
}

/** État et actions du hors-ligne pour la récitation et la lecture affichées. */
export function useHorsLigne({
  dossier,
  alignement,
  lecture,
  pistes,
}: {
  dossier: string | null;
  alignement: string | null;
  lecture: string;
  pistes: readonly Piste[];
}) {
  const [etat, setEtat] = useState<EtatHorsLigne>({
    possible: false,
    telecharges: new Set(),
    progres: null,
    erreur: null,
    place: null,
    texteGarde: false,
  });

  const rafraichir = useCallback(async () => {
    if (!horsLignePossible()) return;
    const [telecharges, estimation] = await Promise.all([
      dossier ? fichiersTelecharges(dossier) : Promise.resolve(new Set<string>()),
      navigator.storage?.estimate?.().catch(() => null) ?? Promise.resolve(null),
    ]);
    let texteGarde = false;
    try {
      texteGarde = Boolean(localStorage.getItem(`coran-texte-${lecture}`));
    } catch {
      // stockage indisponible
    }
    setEtat((e) => ({ ...e, possible: true, telecharges, place: estimation?.usage ?? null, texteGarde }));
  }, [dossier, lecture]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const fichiers = pistes.map((p) => ({ piste: p, fichier: fichierVerset(p.sourate, p.ayah) }));
  const sourateTelechargee = fichiers.length > 0 && fichiers.every((f) => etat.telecharges.has(f.fichier));

  /** Télécharge la récitation de la sourate (et ses repères mot par mot). */
  const telechargerSourate = useCallback(async () => {
    if (!dossier || !horsLignePossible()) return;
    void navigator.storage?.persist?.().catch(() => false);
    const cache = await caches.open(AUDIO);
    const manquants = fichiers.filter((f) => !etat.telecharges.has(f.fichier));
    let fait = fichiers.length - manquants.length;
    let echecs = 0;
    setEtat((e) => ({ ...e, erreur: null, progres: { fait, total: fichiers.length, quoi: "sourate" } }));
    await enParallele(
      manquants,
      async ({ piste, fichier }) => {
        try {
          const r = await fetch(
            `/api/coran/verset?dossier=${encodeURIComponent(dossier)}&fichier=${fichier}`,
          );
          if (!r.ok) throw new Error(String(r.status));
          const corps = await r.blob();
          await cache.put(
            adresseAudio(dossier, fichier),
            new Response(corps, { headers: { "Content-Type": "audio/mpeg" } }),
          );
          if (alignement) {
            const url = `https://cdn.jsdelivr.net/gh/Mohamedd-Ashraf/quran-surah-reciter-audio@main/word-alignment/${alignement}/${piste.sourate}/${piste.ayah}.json`;
            const m = await fetch(url).catch(() => null);
            if (m?.ok) await cache.put(adresseMots(alignement, piste.sourate, piste.ayah), m);
          }
        } catch {
          echecs++;
        }
      },
      () => {
        fait++;
        setEtat((e) => ({ ...e, progres: { fait, total: fichiers.length, quoi: "sourate" } }));
      },
    );
    setEtat((e) => ({
      ...e,
      progres: null,
      erreur: echecs
        ? `${echecs} verset${echecs > 1 ? "s" : ""} n’ont pas pu être téléchargés : réessaie.`
        : null,
    }));
    await rafraichir();
  }, [alignement, dossier, etat.telecharges, fichiers, rafraichir]);

  /** Retire la récitation de cette sourate du téléphone. */
  const supprimerSourate = useCallback(async () => {
    if (!dossier || !horsLignePossible()) return;
    const cache = await caches.open(AUDIO);
    await Promise.all(
      fichiers.flatMap(({ piste, fichier }) => [
        cache.delete(adresseAudio(dossier, fichier)),
        alignement
          ? cache.delete(adresseMots(alignement, piste.sourate, piste.ayah))
          : Promise.resolve(false),
      ]),
    );
    await rafraichir();
  }, [alignement, dossier, fichiers, rafraichir]);

  /** Garde le texte des 114 sourates (lecture affichée) pour les ouvrir sans réseau. */
  const garderTexte = useCallback(async () => {
    if (!horsLignePossible()) return;
    void navigator.storage?.persist?.().catch(() => false);
    const sourates = Array.from({ length: 114 }, (_, i) => i + 1);
    let fait = 0;
    let echecs = 0;
    setEtat((e) => ({ ...e, erreur: null, progres: { fait, total: 114, quoi: "texte" } }));
    await enParallele(
      sourates,
      async (n) => {
        const r = await fetch(`/admin/coran?lecture=${lecture}&sourate=${n}`, {
          headers: { "X-Suivi-Hors-Ligne": "1" },
          credentials: "same-origin",
        }).catch(() => null);
        if (!r?.ok) echecs++;
      },
      () => {
        fait++;
        setEtat((e) => ({ ...e, progres: { fait, total: 114, quoi: "texte" } }));
      },
    );
    if (!echecs) {
      try {
        localStorage.setItem(`coran-texte-${lecture}`, new Date().toISOString());
      } catch {
        // stockage indisponible
      }
    }
    setEtat((e) => ({
      ...e,
      progres: null,
      erreur: echecs ? "Quelques sourates n’ont pas pu être gardées : réessaie." : null,
    }));
    await rafraichir();
  }, [lecture, rafraichir]);

  return { ...etat, sourateTelechargee, telechargerSourate, supprimerSourate, garderTexte };
}

/** « 12,4 Mo » */
export function taille(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

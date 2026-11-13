"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * « Me réciter » : enregistrement de sa propre récitation d'un verset, gardé
 * UNIQUEMENT sur le téléphone (rien n'est envoyé), effacé à la déconnexion.
 */
const CACHE = "suivi-coran-voix-v1";
/** Au-delà, l'enregistrement s'arrête tout seul. */
const DUREE_MAX = 3 * 60 * 1000;

const cleCache = (lecture: string, cle: string) => `/voix/${lecture}/${cle.replace(":", "-")}`;

async function lireVoix(lecture: string, cle: string): Promise<Blob | null> {
  if (!("caches" in window)) return null;
  const r = await (await caches.open(CACHE)).match(cleCache(lecture, cle));
  return r ? r.blob() : null;
}

async function garderVoix(lecture: string, cle: string, blob: Blob): Promise<void> {
  if (!("caches" in window)) return;
  await (
    await caches.open(CACHE)
  ).put(
    cleCache(lecture, cle),
    new Response(blob, { headers: { "Content-Type": blob.type || "audio/webm" } }),
  );
}

async function effacerVoix(lecture: string, cle: string): Promise<void> {
  if (!("caches" in window)) return;
  await (await caches.open(CACHE)).delete(cleCache(lecture, cle));
}

export const enregistrementPossible = () =>
  typeof window !== "undefined" && "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);

export type EtatVoix = "repos" | "autorisation" | "enregistrement" | "lecture";

/** Enregistrer, réécouter et comparer sa récitation d'un verset. */
export function useVoix(lecture: string, cle: string) {
  const [voix, setVoix] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatVoix>("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [debut, setDebut] = useState(0);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const lecteur = useRef<HTMLAudioElement | null>(null);
  const arret = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enregistrement déjà gardé pour ce verset.
  useEffect(() => {
    let url: string | null = null;
    let actif = true;
    void lireVoix(lecture, cle)
      .then((b) => {
        if (!actif || !b) return;
        url = URL.createObjectURL(b);
        setVoix(url);
      })
      .catch(() => undefined);
    return () => {
      actif = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [lecture, cle]);

  const couperMicro = useCallback(() => {
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
    if (arret.current) clearTimeout(arret.current);
  }, []);

  const arreterLecture = useCallback(() => {
    if (lecteur.current) {
      lecteur.current.onended = null;
      lecteur.current.pause();
    }
    lecteur.current = null;
    setEtat((e) => (e === "lecture" ? "repos" : e));
  }, []);

  // En quittant le verset : micro coupé, lecture arrêtée.
  useEffect(
    () => () => {
      const rec = enregistreur.current;
      if (rec?.state === "recording") {
        rec.onstop = null;
        rec.stop();
      }
      couperMicro();
      arreterLecture();
    },
    [arreterLecture, couperMicro],
  );

  const commencer = useCallback(async () => {
    setErreur(null);
    arreterLecture();
    setEtat("autorisation");
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
    } catch {
      setEtat("repos");
      setErreur("Micro refusé : autorise-le dans les réglages du navigateur pour t’enregistrer.");
      return;
    }
    const morceaux: Blob[] = [];
    const rec = new MediaRecorder(flux.current);
    enregistreur.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) morceaux.push(e.data);
    };
    rec.onstop = () => {
      couperMicro();
      const blob = new Blob(morceaux, { type: rec.mimeType || "audio/webm" });
      setEtat("repos");
      if (!blob.size) return;
      setVoix((ancienne) => {
        if (ancienne) URL.revokeObjectURL(ancienne);
        return URL.createObjectURL(blob);
      });
      void garderVoix(lecture, cle, blob).catch(() => undefined);
    };
    rec.start();
    setDebut(Date.now());
    setEtat("enregistrement");
    arret.current = setTimeout(() => rec.state === "recording" && rec.stop(), DUREE_MAX);
  }, [arreterLecture, cle, couperMicro, lecture]);

  const arreter = useCallback(() => {
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
  }, []);

  /** Lit les adresses l'une après l'autre (récitateur puis sa voix). */
  const jouer = useCallback(
    (adresses: readonly string[]) => {
      arreterLecture();
      const suite = [...adresses];
      const suivante = () => {
        const url = suite.shift();
        if (!url) {
          lecteur.current = null;
          setEtat("repos");
          return;
        }
        const a = new Audio(url);
        lecteur.current = a;
        a.onended = suivante;
        a.onerror = suivante;
        void a.play().catch(() => suivante());
      };
      setEtat("lecture");
      suivante();
    },
    [arreterLecture],
  );

  const effacer = useCallback(async () => {
    arreterLecture();
    await effacerVoix(lecture, cle).catch(() => undefined);
    setVoix((ancienne) => {
      if (ancienne) URL.revokeObjectURL(ancienne);
      return null;
    });
  }, [arreterLecture, cle, lecture]);

  return { voix, etat, erreur, debut, commencer, arreter, jouer, arreterLecture, effacer };
}

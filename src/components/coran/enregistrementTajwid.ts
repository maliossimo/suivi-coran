"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Le moteur prend un verset de 30 s au plus. */
export const DUREE_MAX_S = 30;
const FREQ = 16_000;

/** Enregistrement de la récitation, avec le niveau du micro (0 à 1) et le temps écoulé. */
export function useEnregistrement() {
  const [actif, setActif] = useState(false);
  const [niveau, setNiveau] = useState(0);
  const [secondes, setSecondes] = useState(0);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const contexte = useRef<AudioContext | null>(null);
  const boucle = useRef<number | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const fin = useRef<((b: Blob | null) => void) | null>(null);

  const nettoyer = useCallback(() => {
    if (boucle.current !== null) cancelAnimationFrame(boucle.current);
    boucle.current = null;
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
    void contexte.current?.close().catch(() => undefined);
    contexte.current = null;
    setActif(false);
    setNiveau(0);
  }, []);

  // En quittant : micro coupé, enregistrement abandonné.
  const abandonner = useCallback(() => {
    fin.current = null;
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
    nettoyer();
  }, [nettoyer]);
  useEffect(() => abandonner, [abandonner]);

  /** Démarre ; la promesse rend l'enregistrement quand il s'arrête (bouton ou 30 s). */
  const demarrer = useCallback(async (): Promise<Blob | null> => {
    const micro = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
    flux.current = micro;
    const ctx = new AudioContext();
    contexte.current = ctx;
    const analyseur = ctx.createAnalyser();
    analyseur.fftSize = 512;
    ctx.createMediaStreamSource(micro).connect(analyseur);
    const tampon = new Uint8Array(analyseur.fftSize);
    const debut = performance.now();
    const tic = () => {
      analyseur.getByteTimeDomainData(tampon);
      let max = 0;
      for (const v of tampon) max = Math.max(max, Math.abs(v - 128));
      setNiveau(Math.min(1, max / 64));
      const s = (performance.now() - debut) / 1000;
      setSecondes(s);
      if (s >= DUREE_MAX_S && enregistreur.current?.state === "recording") enregistreur.current.stop();
      boucle.current = requestAnimationFrame(tic);
    };

    const rec = new MediaRecorder(micro);
    enregistreur.current = rec;
    morceaux.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) morceaux.current.push(e.data);
    };
    const resultat = new Promise<Blob | null>((ok) => {
      fin.current = ok;
    });
    rec.onstop = () => {
      nettoyer();
      const blob = morceaux.current.length ? new Blob(morceaux.current, { type: rec.mimeType }) : null;
      fin.current?.(blob);
      fin.current = null;
    };
    rec.start();
    setSecondes(0);
    setActif(true);
    boucle.current = requestAnimationFrame(tic);
    return resultat;
  }, [nettoyer]);

  const arreter = useCallback(() => {
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
  }, []);

  return { actif, niveau, secondes, demarrer, arreter };
}

/** Audio enregistré → PCM 16 kHz mono 16 bits, ce que lit le moteur. */
export async function versPcm16k(blob: Blob): Promise<ArrayBuffer> {
  const donnees = await blob.arrayBuffer();
  const ctx = new AudioContext();
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(donnees);
  } finally {
    void ctx.close().catch(() => undefined);
  }
  const longueur = Math.max(1, Math.ceil(audio.duration * FREQ));
  const horsLigne = new OfflineAudioContext(1, longueur, FREQ);
  const source = horsLigne.createBufferSource();
  source.buffer = audio;
  source.connect(horsLigne.destination);
  source.start();
  const rendu = await horsLigne.startRendering();
  const flottants = rendu.getChannelData(0);
  const pcm = new Int16Array(flottants.length);
  for (let i = 0; i < flottants.length; i++) {
    const v = Math.max(-1, Math.min(1, flottants[i] ?? 0));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return pcm.buffer;
}

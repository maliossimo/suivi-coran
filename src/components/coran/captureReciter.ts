"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  avisSon,
  contientParole,
  estimerBruit,
  pointDeCoupe,
  seuilVoix,
  type AvisSon,
  type Trame,
} from "@/domain/decoupage";

const FREQ = 16_000;
const TAILLE_TRAME = 4096; // ≈ 256 ms à 16 kHz
/** Une séance de récitation : au plus 10 minutes. */
const DUREE_MAX_S = 600;

/**
 * Le micro pendant le mode Réciter : l'audio est ramené à 16 kHz au fil de l'eau, découpé aux pauses,
 * et chaque morceau est remis aussitôt (pour être analysé pendant que l'élève continue).
 */
export function useCaptureReciter(onMorceau: (pcm: Int16Array) => void) {
  const [actif, setActif] = useState(false);
  const [niveau, setNiveau] = useState(0);
  const [secondes, setSecondes] = useState(0);
  const [avis, setAvis] = useState<AvisSon>("attente");
  const rappel = useRef(onMorceau);
  rappel.current = onMorceau;
  const ressources = useRef<{ flux: MediaStream; ctx: AudioContext; noeud: ScriptProcessorNode } | null>(
    null,
  );
  const etat = useRef({
    toutes: [] as Trame[], // toutes les trames de la séance (bruit de fond, avis)
    trames: [] as Trame[], // celles du morceau en cours
    echantillons: [] as Int16Array[], // une par trame du morceau en cours
    reste: new Float32Array(0), // échantillons 16 kHz pas encore groupés en trame
    total: 0,
  });

  const emettre = useCallback((trames: Trame[], echantillons: Int16Array[]) => {
    const bruit = estimerBruit(etat.current.toutes);
    if (!contientParole(trames, bruit)) return;
    // On retire le silence du début (on en garde une trame).
    const seuil = seuilVoix(bruit);
    const premier = Math.max(0, trames.findIndex((t) => t.rms >= seuil) - 1);
    const morceau = echantillons.slice(premier);
    const pcm = new Int16Array(morceau.reduce((n, e) => n + e.length, 0));
    let o = 0;
    for (const e of morceau) {
      pcm.set(e, o);
      o += e.length;
    }
    rappel.current(pcm);
  }, []);

  const ajouterTrame = useCallback(
    (bloc: Float32Array) => {
      let somme = 0;
      let pic = 0;
      const pcm = new Int16Array(bloc.length);
      for (let i = 0; i < bloc.length; i++) {
        const v = Math.max(-1, Math.min(1, bloc[i]!));
        somme += v * v;
        pic = Math.max(pic, Math.abs(v));
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
      const trame = { rms: Math.sqrt(somme / bloc.length), pic };
      const e = etat.current;
      e.toutes.push(trame);
      e.trames.push(trame);
      e.echantillons.push(pcm);
      const bruit = estimerBruit(e.toutes);
      setNiveau(Math.min(1, trame.rms * 8));
      setAvis(avisSon(e.toutes, bruit));
      const coupe = pointDeCoupe(e.trames, bruit);
      if (coupe !== null) {
        emettre(e.trames.slice(0, coupe), e.echantillons.slice(0, coupe));
        e.trames = e.trames.slice(coupe);
        e.echantillons = e.echantillons.slice(coupe);
      }
    },
    [emettre],
  );

  const liberer = useCallback(() => {
    const r = ressources.current;
    ressources.current = null;
    if (!r) return;
    r.noeud.onaudioprocess = null;
    r.noeud.disconnect();
    r.flux.getTracks().forEach((t) => t.stop());
    void r.ctx.close().catch(() => undefined);
    setActif(false);
    setNiveau(0);
  }, []);

  useEffect(() => liberer, [liberer]);

  const demarrer = useCallback(async () => {
    const flux = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(flux);
    const noeud = ctx.createScriptProcessor(4096, 1, 1);
    const rapport = ctx.sampleRate / FREQ;
    etat.current = { toutes: [], trames: [], echantillons: [], reste: new Float32Array(0), total: 0 };
    noeud.onaudioprocess = (ev) => {
      const entree = ev.inputBuffer.getChannelData(0);
      // Ramène à 16 kHz : moyenne de chaque groupe d'échantillons (filtre simple contre le repliement).
      const n = Math.floor(entree.length / rapport);
      const sortie = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = Math.floor(i * rapport);
        const b = Math.max(a + 1, Math.floor((i + 1) * rapport));
        let s = 0;
        for (let j = a; j < b; j++) s += entree[j]!;
        sortie[i] = s / (b - a);
      }
      const e = etat.current;
      const tout = new Float32Array(e.reste.length + n);
      tout.set(e.reste);
      tout.set(sortie, e.reste.length);
      let o = 0;
      while (tout.length - o >= TAILLE_TRAME) {
        ajouterTrame(tout.subarray(o, o + TAILLE_TRAME));
        o += TAILLE_TRAME;
      }
      e.reste = tout.slice(o);
      e.total += n;
      setSecondes(e.total / FREQ);
      if (e.total / FREQ >= DUREE_MAX_S) arreterRef.current();
    };
    source.connect(noeud);
    noeud.connect(ctx.destination); // nécessaire pour que le nœud tourne (il ne produit aucun son)
    ressources.current = { flux, ctx, noeud };
    setSecondes(0);
    setAvis("attente");
    setActif(true);
  }, [ajouterTrame]);

  /** Arrête et remet le dernier morceau. */
  const arreter = useCallback(() => {
    if (!ressources.current) return;
    liberer();
    const e = etat.current;
    emettre(e.trames, e.echantillons);
    e.trames = [];
    e.echantillons = [];
  }, [emettre, liberer]);
  const arreterRef = useRef(arreter);
  arreterRef.current = arreter;

  return { actif, niveau, secondes, avis, demarrer, arreter };
}

/** Un extrait (secondes) d'un morceau, en WAV, pour le réécouter. */
export function extraitWav(pcm: Int16Array, debut = 0, fin = Infinity): Blob {
  const a = Math.max(0, Math.floor(debut * FREQ));
  const b = Math.min(pcm.length, Math.ceil(fin * FREQ));
  const donnees = pcm.subarray(a, Math.max(a, b));
  const tampon = new ArrayBuffer(44 + donnees.length * 2);
  const v = new DataView(tampon);
  const texte = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  texte(0, "RIFF");
  v.setUint32(4, 36 + donnees.length * 2, true);
  texte(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, FREQ, true);
  v.setUint32(28, FREQ * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texte(36, "data");
  v.setUint32(40, donnees.length * 2, true);
  new Int16Array(tampon, 44).set(donnees);
  return new Blob([tampon], { type: "audio/wav" });
}

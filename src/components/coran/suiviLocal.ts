"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Reference } from "@/domain/suivi";
import type { MessageDuSuivi, MessageVersSuivi } from "./suiviLocal.worker";

/** Au-delà, le téléphone est trop lent pour suivre : le serveur reprend le suivi. */
const TROP_LENT_MS = 1500;

export type EtatSuiviLocal = "absent" | "chargement" | "pret" | "indisponible";

/**
 * Suivi en direct sur le téléphone (modèle compressé, dans un fil à part). Indisponible (vieux téléphone,
 * économiseur de données, modèle absent…) ou trop lent : le suivi par le serveur prend le relais.
 */
export function useSuiviLocal(actif: boolean) {
  const fil = useRef<Worker | null>(null);
  const [etat, setEtat] = useState<EtatSuiviLocal>("absent");
  const attente = useRef(new Map<number, (c: [number, number] | null) => void>());
  const prochain = useRef(1);
  const durees = useRef<number[]>([]);
  /** Le modèle a déjà écouté au moins une fois sans erreur (diagnostic, tests de bout en bout). */
  const [essaiReussi, setEssaiReussi] = useState(false);
  const echecs = useRef(0);

  useEffect(() => {
    if (!actif || fil.current) return;
    const reseau = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    // Économiseur de données ou réseau très lent : pas de téléchargement du modèle (23 Mo).
    const economie = reseau?.saveData || /2g/.test(reseau?.effectiveType ?? "");
    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined" || economie) {
      setEtat("indisponible");
      return;
    }
    let w: Worker;
    try {
      w = new Worker(new URL("./suiviLocal.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setEtat("indisponible");
      return;
    }
    fil.current = w;
    setEtat("chargement");
    w.onmessage = (e: MessageEvent<MessageDuSuivi>) => {
      const m = e.data;
      if (m.type === "pret") setEtat("pret");
      else if (m.type === "echec") setEtat("indisponible");
      else {
        if (m.ok) setEssaiReussi(true);
        // Le modèle échoue à répétition : le serveur reprend le suivi.
        else if (++echecs.current >= 3) setEtat("indisponible");
        const d = durees.current;
        d.push(m.ms);
        if (d.length > 5) d.shift();
        const triees = [...d].sort((a, b) => a - b);
        if (d.length >= 3 && triees[Math.floor(triees.length / 2)]! > TROP_LENT_MS) setEtat("indisponible");
        attente.current.get(m.id)?.(m.couverts);
        attente.current.delete(m.id);
      }
    };
    w.onerror = () => setEtat("indisponible");
    w.postMessage({ type: "charger" } satisfies MessageVersSuivi);
  }, [actif]);

  useEffect(
    () => () => {
      fil.current?.terminate();
      fil.current = null;
      for (const r of attente.current.values()) r(null);
      attente.current.clear();
    },
    [],
  );

  /** Jusqu'où l'élève est arrivé, d'après les dernières secondes (16 kHz, entre -1 et 1). */
  const suivre = useCallback(
    (son: Float32Array, reference: Reference, depuis: number, riwaya: string) =>
      new Promise<[number, number] | null>((resoudre) => {
        const w = fil.current;
        if (!w) return resoudre(null);
        const id = prochain.current++;
        attente.current.set(id, resoudre);
        w.postMessage({ type: "suivre", id, son, reference, depuis, riwaya } satisfies MessageVersSuivi, [
          son.buffer as ArrayBuffer,
        ]);
      }),
    [],
  );

  return { etat, suivre, essaiReussi };
}

/** L'écriture attendue du passage (calculée par le serveur une fois), pour situer l'élève sur le téléphone. */
export async function chargerReference(
  jeton: string,
  q: URLSearchParams,
): Promise<(Reference & { passage: [number, number, string][] }) | null> {
  q.set("reference", "1");
  const r = await fetch(`/api/moteur_tajwid?${q}`, {
    method: "POST",
    headers: { Authorization: `Jeton ${jeton}` },
  }).catch(() => null);
  if (!r?.ok) return null;
  const brut = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  const { phonemes, spans, passage } = brut ?? {};
  const paire = (x: unknown): x is [number, number] =>
    Array.isArray(x) && x.length === 2 && x.every((n) => Number.isInteger(n));
  if (typeof phonemes !== "string" || !Array.isArray(spans) || !spans.every(paire) || !Array.isArray(passage))
    return null;
  const mots = passage.filter(
    (p): p is [number, number, string] =>
      Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && typeof p[2] === "string",
  );
  if (mots.length !== spans.length) return null;
  return { phonemes, spans, passage: mots };
}

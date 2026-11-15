/**
 * Suivi en direct sur le téléphone, à l'écart de l'écran (aucun ralentissement) : le modèle compressé
 * écoute les dernières secondes et situe l'élève dans le passage, sans aller-retour avec le serveur.
 * Le jugement (fautes, madd, ghunna…) reste fait par le serveur, à chaque pause, avec la double écoute.
 */
import * as ort from "onnxruntime-web/wasm";
import { FREQ_MEL, logMel } from "@/domain/mel";
import {
  ADRESSE_MODELE,
  couverts,
  decoderCtc,
  EMPREINTE_MODELE,
  RIWAYAT,
  type Reference,
} from "@/domain/suivi";

const CACHE = "suivi-coran-modele-v1";
const LEAD = Math.round(FREQ_MEL * 0.4); // comme le serveur : 0,4 s de silence de part et d'autre

export type MessageVersSuivi =
  | { type: "charger" }
  | { type: "suivre"; id: number; son: Float32Array; reference: Reference; depuis: number; riwaya: string };
export type MessageDuSuivi =
  | { type: "pret" }
  | { type: "echec"; raison: string }
  | { type: "couverts"; id: number; couverts: [number, number] | null; ms: number; ok: boolean };

let session: ort.InferenceSession | null = null;
let chargement: Promise<void> | null = null;

const envoyer = (m: MessageDuSuivi) =>
  (self as unknown as { postMessage(m: MessageDuSuivi): void }).postMessage(m);

async function hex(donnees: ArrayBuffer): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", donnees));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Le modèle : dans le téléphone s'il y est déjà, sinon téléchargé une fois (vérifié) puis gardé. */
async function modele(): Promise<ArrayBuffer> {
  const cache = await caches.open(CACHE).catch(() => null);
  const garde = await cache?.match(ADRESSE_MODELE);
  if (garde) {
    const d = await garde.arrayBuffer();
    if ((await hex(d)) === EMPREINTE_MODELE) return d;
    await cache?.delete(ADRESSE_MODELE);
  }
  const r = await fetch(ADRESSE_MODELE);
  if (!r.ok) throw new Error(`modèle indisponible (${r.status})`);
  const d = await r.arrayBuffer();
  if ((await hex(d)) !== EMPREINTE_MODELE) throw new Error("empreinte du modèle inattendue");
  // Les anciennes versions du modèle sont retirées : une seule copie dans le téléphone.
  if (cache) {
    for (const cle of await cache.keys()) if (!cle.url.endsWith(ADRESSE_MODELE)) await cache.delete(cle);
    await cache.put(
      ADRESSE_MODELE,
      new Response(d, { headers: { "Content-Type": "application/octet-stream" } }),
    );
  }
  return d;
}

async function charger(): Promise<void> {
  ort.env.wasm.wasmPaths = "/tajwid/ort/";
  ort.env.wasm.numThreads = 1; // pas d'isolation multi-origine : un seul fil
  ort.env.wasm.proxy = false;
  session = await ort.InferenceSession.create(new Uint8Array(await modele()), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}

async function suivre(son: Float32Array, reference: Reference, depuis: number, riwaya: string) {
  if (!session) return null;
  const audio = new Float32Array(son.length + 2 * LEAD);
  audio.set(son, LEAD);
  const { valeurs, trames } = logMel(audio);
  const t = Math.min(3000, Math.floor(trames / 2) * 2);
  if (t < 2) return null;
  const mel = new Float32Array(80 * t);
  for (let b = 0; b < 80; b++) mel.set(valeurs.subarray(b * trames, b * trames + t), b * t);
  const indice = Math.max(0, RIWAYAT.indexOf(riwaya as (typeof RIWAYAT)[number]));
  const sorties = await session.run({
    mel: new ort.Tensor("float32", mel, [1, 80, t]),
    riwaya: new ort.Tensor("int64", BigInt64Array.from([BigInt(indice)]), [1]),
  });
  const lp = sorties[session.outputNames[0]!]!;
  const [, instants, symboles] = lp.dims as [number, number, number];
  const entendu = decoderCtc(lp.data as Float32Array, instants, symboles);
  return couverts(entendu, reference, depuis);
}

self.onmessage = (e: MessageEvent<MessageVersSuivi>) => {
  const m = e.data;
  if (m.type === "charger") {
    chargement ??= charger();
    chargement.then(
      () => envoyer({ type: "pret" }),
      (err: unknown) => envoyer({ type: "echec", raison: err instanceof Error ? err.message : String(err) }),
    );
    return;
  }
  const debut = performance.now();
  suivre(m.son, m.reference, m.depuis, m.riwaya).then(
    (c) => envoyer({ type: "couverts", id: m.id, couverts: c, ms: performance.now() - debut, ok: true }),
    () => envoyer({ type: "couverts", id: m.id, couverts: null, ms: performance.now() - debut, ok: false }),
  );
};

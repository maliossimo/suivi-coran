"use client";

/**
 * Petits retours quand une action réussit : une vibration courte et un son discret
 * (deux notes douces, synthétisées : aucun fichier). Désactivables dans « Mon compte ».
 */
const CLE = "retours-sensoriels";

export function retoursActives(): boolean {
  try {
    return localStorage.getItem(CLE) !== "non";
  } catch {
    return true;
  }
}

export function activerRetours(actifs: boolean): void {
  try {
    localStorage.setItem(CLE, actifs ? "oui" : "non");
  } catch {
    // stockage indisponible
  }
}

let contexte: AudioContext | null = null;

function jouerNotes(frequences: readonly number[]): void {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  contexte ??= new Ctor();
  const ctx = contexte;
  if (ctx.state === "suspended") void ctx.resume();
  frequences.forEach((f, i) => {
    const debut = ctx.currentTime + i * 0.09;
    const osc = ctx.createOscillator();
    const volume = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    volume.gain.setValueAtTime(0.0001, debut);
    volume.gain.exponentialRampToValueAtTime(0.06, debut + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, debut + 0.22);
    osc.connect(volume).connect(ctx.destination);
    osc.start(debut);
    osc.stop(debut + 0.25);
  });
}

/** « succes » : enregistré ; « leger » : petite action (marque-page…). */
export function retourSensoriel(type: "succes" | "leger" = "succes"): void {
  if (typeof window === "undefined" || !retoursActives()) return;
  try {
    navigator.vibrate?.(type === "succes" ? [12, 40, 18] : 10);
    jouerNotes(type === "succes" ? [660, 990] : [880]);
  } catch {
    // son ou vibration indisponibles : sans gravité
  }
}

/**
 * Découpage d'une récitation en morceaux envoyés au moteur pendant que l'élève récite :
 * on coupe à une pause (silence), jamais au milieu d'un mot, et au plus toutes les ~25 s
 * (le modèle prend 30 s au plus). Et un avis simple sur le son (trop bas, trop fort, bruyant).
 *
 * L'audio arrive par trames (≈ 256 ms) dont on ne regarde ici que le niveau (RMS) et le pic.
 */

export const DUREE_TRAME_S = 4096 / 16_000;
const PAUSE_S = 0.75; // une pause franche
const MORCEAU_MIN_S = 2; // pas de morceau trop court
const MORCEAU_MAX_S = 25;
const BRUIT_MIN = 0.004; // niveau d'un silence dans une pièce calme

export interface Trame {
  rms: number;
  pic: number;
}

/** Seuil de voix : au-dessus du bruit de fond mesuré (les trames les plus calmes), jamais trop bas. */
export function seuilVoix(bruit: number): number {
  // Assez bas pour une voix douce ou un téléphone qui capte faiblement (avant : 0,015 et 3 × le bruit,
  // des morceaux entiers étaient pris pour du silence et jamais analysés).
  return Math.max(0.008, bruit * 2.5);
}

/** Seuil du silence, plus bas que celui de la voix : une fin de mot douce n'est pas prise pour une pause. */
export function seuilSilence(bruit: number): number {
  return seuilVoix(bruit) * 0.7;
}

/**
 * Où couper le morceau en cours (trames depuis son début) ; null : continuer.
 * On coupe à la fin d'une pause d'au moins 0,75 s après au moins 2 s de récitation,
 * ou, passé 25 s, à la trame la plus calme des 4 dernières secondes.
 */
export function pointDeCoupe(trames: readonly Trame[], bruit: number): number | null {
  const seuil = seuilVoix(bruit);
  const n = trames.length;
  const duree = n * DUREE_TRAME_S;
  const pause = Math.ceil(PAUSE_S / DUREE_TRAME_S);
  const parole = trames.some((t) => t.rms >= seuil);
  if (!parole) return null;
  const silence = seuilSilence(bruit);
  if (duree >= MORCEAU_MIN_S && n >= pause && trames.slice(n - pause).every((t) => t.rms < silence)) {
    return n - pause + 1; // on garde un petit bout de silence après le dernier mot
  }
  if (duree >= MORCEAU_MAX_S) {
    const fenetre = Math.ceil(4 / DUREE_TRAME_S);
    let calme = n - 1;
    for (let i = n - fenetre; i < n; i++) if (i > 0 && trames[i]!.rms < trames[calme]!.rms) calme = i;
    return calme;
  }
  return null;
}

/** Le morceau contient-il assez de récitation pour être analysé ? */
export function contientParole(trames: readonly Trame[], bruit: number): boolean {
  const seuil = seuilVoix(bruit);
  return trames.filter((t) => t.rms >= seuil).length * DUREE_TRAME_S >= 0.5;
}

/** Bruit de fond : le niveau des trames les plus calmes (10e centile). */
export function estimerBruit(trames: readonly Trame[]): number {
  if (!trames.length) return BRUIT_MIN;
  const tries = trames.map((t) => t.rms).sort((a, b) => a - b);
  return Math.max(BRUIT_MIN, tries[Math.floor(tries.length / 10)]!);
}

export type AvisSon = "attente" | "bon" | "bas" | "fort" | "bruit";

export const LIBELLE_AVIS: Record<AvisSon, string> = {
  attente: "Je t’écoute…",
  bon: "Son parfait",
  bas: "Parle un peu plus fort",
  fort: "Un peu moins fort, ou éloigne le téléphone",
  bruit: "Endroit bruyant : mets-toi au calme",
};

/** Avis sur les dernières secondes : saturation, voix trop faible, bruit de fond. */
export function avisSon(trames: readonly Trame[], bruit: number): AvisSon {
  const recentes = trames.slice(-12); // ≈ 3 s
  const voix = recentes.filter((t) => t.rms >= seuilVoix(bruit));
  if (recentes.filter((t) => t.pic >= 0.99).length >= 2) return "fort";
  if (bruit > 0.05) return "bruit";
  if (!voix.length) return trames.length < 8 ? "attente" : "bas";
  const moyenne = voix.reduce((s, t) => s + t.rms, 0) / voix.length;
  // Le volume est remonté avant l'analyse : on ne demande de parler plus fort que pour une voix vraiment faible.
  return moyenne < 0.015 ? "bas" : "bon";
}

/** Volume visé pour le moteur (RMS de la voix), et gain maximal (au-delà, on amplifierait le bruit). */
const RMS_VISE = 0.1;
const GAIN_MAX = 8;

/**
 * Ramène une voix faible à un volume confortable pour le moteur de reconnaissance, sans jamais saturer :
 * le gain est calculé sur les passages où l'on parle (pas sur les silences) et plafonné par le pic.
 * Une voix déjà assez forte n'est pas touchée.
 */
export function normaliserVolume(pcm: Int16Array): Int16Array {
  if (!pcm.length) return pcm;
  const fenetre = 1600; // 0,1 s à 16 kHz
  const niveaux: number[] = [];
  let pic = 0;
  for (let debut = 0; debut < pcm.length; debut += fenetre) {
    const fin = Math.min(pcm.length, debut + fenetre);
    let somme = 0;
    for (let i = debut; i < fin; i++) {
      const v = pcm[i]! / 32768;
      somme += v * v;
      pic = Math.max(pic, Math.abs(v));
    }
    niveaux.push(Math.sqrt(somme / (fin - debut)));
  }
  // Niveau de la voix : moyenne de la moitié la plus forte des fenêtres.
  const forts = [...niveaux].sort((a, b) => b - a).slice(0, Math.max(1, Math.ceil(niveaux.length / 2)));
  const voix = forts.reduce((s, x) => s + x, 0) / forts.length;
  if (voix <= 0 || pic <= 0) return pcm;
  const gain = Math.min(RMS_VISE / voix, 0.95 / pic, GAIN_MAX);
  if (gain <= 1.15) return pcm;
  const sortie = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    sortie[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i]! * gain)));
  }
  return sortie;
}

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
  return Math.max(0.015, bruit * 3);
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
  if (duree >= MORCEAU_MIN_S && n >= pause && trames.slice(n - pause).every((t) => t.rms < seuil)) {
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
  return moyenne < 0.03 ? "bas" : "bon";
}

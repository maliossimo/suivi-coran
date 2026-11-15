/**
 * Spectrogramme log-Mel de Whisper (80 bandes, 16 kHz), calculé sur le téléphone pour le suivi en direct.
 * Copie fidèle de api/_tajwid/mel.py (le même que côté serveur : le modèle a appris sur ces valeurs).
 */

export const FREQ_MEL = 16_000;
const N_FFT = 400;
const PAS = 160;
const BANDES = 80;
const CASES = N_FFT / 2 + 1; // 201

let filtres: Float32Array | null = null;

/** Filtres Mel (échelle de Slaney, normalisés), 80 × 201, comme get_mel_filters. */
export function filtresMel(): Float32Array {
  if (filtres) return filtres;
  const fftfreqs = Array.from({ length: CASES }, (_, i) => (i * FREQ_MEL) / N_FFT);
  const maxMel = 45.245640471924965;
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logstep = Math.log(6.4) / 27;
  const freqs = Array.from({ length: BANDES + 2 }, (_, i) => {
    const mel = (maxMel * i) / (BANDES + 1);
    return mel >= minLogMel ? minLogHz * Math.exp(logstep * (mel - minLogMel)) : fSp * mel;
  });
  const f = new Float32Array(BANDES * CASES);
  for (let m = 0; m < BANDES; m++) {
    const enorm = 2 / (freqs[m + 2]! - freqs[m]!);
    for (let k = 0; k < CASES; k++) {
      const bas = -(freqs[m]! - fftfreqs[k]!) / (freqs[m + 1]! - freqs[m]!);
      const haut = (freqs[m + 2]! - fftfreqs[k]!) / (freqs[m + 2]! - freqs[m + 1]!);
      f[m * CASES + k] = Math.max(0, Math.min(bas, haut)) * enorm;
    }
  }
  filtres = f;
  return f;
}

let bornes: Int32Array | null = null;
/** Pour chaque bande, les cases non nulles [début, fin) : le produit ne parcourt qu'elles. */
function bornesFiltres(): Int32Array {
  if (bornes) return bornes;
  const f = filtresMel();
  const b = new Int32Array(BANDES * 2);
  for (let m = 0; m < BANDES; m++) {
    let a = 0;
    let z = CASES;
    while (a < CASES && f[m * CASES + a] === 0) a++;
    while (z > a && f[m * CASES + z - 1] === 0) z--;
    b[2 * m] = a;
    b[2 * m + 1] = z;
  }
  return (bornes = b);
}

let fenetre: Float32Array | null = null;
const COS = Float64Array.from({ length: N_FFT }, (_, i) => Math.cos((2 * Math.PI * i) / N_FFT));
const SIN = Float64Array.from({ length: N_FFT }, (_, i) => Math.sin((2 * Math.PI * i) / N_FFT));

/**
 * Transformée de Fourier de taille 400 = 2⁴ × 5² (Cooley-Tukey à bases mixtes), ~6 fois plus rapide
 * que la transformée directe. `pas` et `debut` lisent une sous-suite de l'entrée sans la copier.
 */
const TR = new Float64Array(5);
const TI = new Float64Array(5);

function tf(
  entree: Float64Array,
  n: number,
  pas: number,
  debut: number,
  re: Float64Array,
  im: Float64Array,
  o: number,
  imEntree: Float64Array,
): void {
  if (n === 1) {
    re[o] = entree[debut]!;
    im[o] = imEntree[debut]!;
    return;
  }
  const p = n % 2 === 0 ? 2 : 5;
  const m = n / p;
  for (let r = 0; r < p; r++) tf(entree, m, pas * p, debut + r * pas, re, im, o + r * m, imEntree);
  const tr = TR;
  const ti = TI;
  const pasW = N_FFT / n; // W_n^j = W_400^(j·400/n)
  for (let k = 0; k < m; k++) {
    for (let r = 0; r < p; r++) {
      tr[r] = re[o + r * m + k]!;
      ti[r] = im[o + r * m + k]!;
    }
    for (let q = 0; q < p; q++) {
      const kk = k + q * m;
      let sr = 0;
      let si = 0;
      for (let r = 0; r < p; r++) {
        const w = ((r * kk) % n) * pasW;
        const c = COS[w]!;
        const s = -SIN[w]!;
        sr += tr[r]! * c - ti[r]! * s;
        si += tr[r]! * s + ti[r]! * c;
      }
      re[o + kk] = sr;
      im[o + kk] = si;
    }
  }
}

function hann(): Float32Array {
  // np.hanning(401)[:-1] : fenêtre de Hann « périodique »
  return (fenetre ??= Float32Array.from(
    { length: N_FFT },
    (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N_FFT),
  ));
}

/**
 * Log-Mel d'un son (échantillons entre -1 et 1), sans remplissage final (padding=0 côté serveur).
 * Rend `trames` colonnes de 80 valeurs, rangées bande par bande ([80, trames], comme numpy).
 */
export function logMel(son: Float32Array): { valeurs: Float32Array; trames: number } {
  const fen = hann();
  const f = filtresMel();
  const nz = bornesFiltres();
  const demi = N_FFT / 2;
  // stft(center=True, mode="reflect")
  const n = son.length;
  const x = new Float32Array(n + N_FFT);
  for (let i = 0; i < x.length; i++) {
    let j = i - demi;
    if (j < 0) j = -j;
    else if (j >= n) j = 2 * (n - 1) - j;
    x[i] = son[Math.min(n - 1, Math.max(0, j))] ?? 0;
  }
  const total = 1 + Math.floor((x.length - N_FFT) / PAS);
  const trames = total - 1; // la dernière trame est retirée (stft[..., :-1])
  const valeurs = new Float32Array(BANDES * Math.max(0, trames));
  const cadre = new Float64Array(N_FFT);
  const zeros = new Float64Array(N_FFT);
  const re = new Float64Array(N_FFT);
  const im = new Float64Array(N_FFT);
  const puissance = new Float32Array(CASES);
  let max = -Infinity;
  for (let t = 0; t < trames; t++) {
    const o = t * PAS;
    for (let i = 0; i < N_FFT; i++) cadre[i] = x[o + i]! * fen[i]!;
    tf(cadre, N_FFT, 1, 0, re, im, 0, zeros);
    for (let k = 0; k < CASES; k++) puissance[k] = re[k]! * re[k]! + im[k]! * im[k]!;
    for (let m = 0; m < BANDES; m++) {
      let s = 0;
      const base = m * CASES;
      for (let k = nz[2 * m]!; k < nz[2 * m + 1]!; k++) s += f[base + k]! * puissance[k]!;
      const v = Math.log10(Math.max(s, 1e-10));
      valeurs[m * trames + t] = v;
      if (v > max) max = v;
    }
  }
  for (let i = 0; i < valeurs.length; i++) valeurs[i] = (Math.max(valeurs[i]!, max - 8) + 4) / 4;
  return { valeurs, trames };
}

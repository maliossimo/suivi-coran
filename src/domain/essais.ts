/** Essais du mode Réciter : règles pures (historique d'un passage, mots difficiles). */

export interface FauteEssai {
  verset: number;
  mot: string;
  regle: string;
}

export interface Essai {
  sourate: number;
  du: number;
  au: number;
  score: number;
  fautes: FauteEssai[];
  quand: string;
}

/** Les fautes d'un essai à garder : mots à reprendre (sûrs), une par mot, 40 au plus. */
export function fautesAGarder(
  mots: readonly {
    verset: number;
    mot: string;
    etat: string;
    remarques?: readonly { regle: string; sure: boolean }[];
  }[],
): FauteEssai[] {
  const vus = new Set<string>();
  const fautes: FauteEssai[] = [];
  for (const m of mots) {
    if (m.etat !== "erreur" && m.etat !== "oublie" && m.etat !== "a_revoir") continue;
    const sure = (m.remarques ?? []).find((r) => r.sure);
    if (m.etat !== "oublie" && !sure) continue; // une hésitation n'est pas une faute à retenir
    const cle = `${m.verset}|${m.mot}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    fautes.push({
      verset: m.verset,
      mot: m.mot,
      regle: m.etat === "oublie" ? "oubli" : (sure?.regle.split(":")[0] ?? ""),
    });
    if (fautes.length >= 40) break;
  }
  return fautes;
}

/** Les essais qui portent sur un passage qui recouvre [du, au], du plus récent au plus ancien. */
export function essaisDuPassage(essais: readonly Essai[], sourate: number, du: number, au: number): Essai[] {
  return essais.filter((e) => e.sourate === sourate && e.du <= au && e.au >= du);
}

export interface MotDifficile {
  verset: number;
  mot: string;
  fois: number;
}

/**
 * Les mots où l'élève se trompe le plus souvent (au moins 2 fois), les plus fréquents d'abord ;
 * un mot réussi lors d'un essai plus récent qui le couvrait n'est plus difficile.
 */
export function motsDifficiles(essais: readonly Essai[], sourate: number, nombre = 8): MotDifficile[] {
  const compte = new Map<string, MotDifficile & { dernier: string }>();
  for (const e of essais) {
    if (e.sourate !== sourate) continue;
    for (const f of e.fautes) {
      const cle = `${f.verset}|${f.mot}`;
      const c = compte.get(cle);
      if (c) {
        c.fois++;
        if (e.quand > c.dernier) c.dernier = e.quand;
      } else compte.set(cle, { verset: f.verset, mot: f.mot, fois: 1, dernier: e.quand });
    }
  }
  const reussi = (m: { verset: number; mot: string; dernier: string }) =>
    essais.some(
      (e) =>
        e.sourate === sourate &&
        e.quand > m.dernier &&
        e.du <= m.verset &&
        e.au >= m.verset &&
        !e.fautes.some((f) => f.verset === m.verset && f.mot === m.mot),
    );
  return [...compte.values()]
    .filter((m) => m.fois >= 2 && !reussi(m))
    .sort((a, b) => b.fois - a.fois || a.verset - b.verset)
    .slice(0, nombre)
    .map(({ verset, mot, fois }) => ({ verset, mot, fois }));
}

export interface MotARevoir {
  sourate: number;
  verset: number;
  mot: string;
  /** Raté pour la dernière fois (date de l'essai). */
  quand: string;
  /** Réussites depuis (essais qui couvraient le verset sans cette faute) : 2 → le mot sort de la liste. */
  reussites: number;
}

/**
 * Les mots à revoir : ratés lors d'une récitation et pas encore réussis deux fois depuis, les plus récents
 * d'abord. Un essai « réussit » un mot s'il couvrait son verset sans le compter parmi ses fautes.
 */
export function motsARevoir(essais: readonly Essai[], nombre = 60): MotARevoir[] {
  const derniers = new Map<string, MotARevoir>();
  for (const e of essais)
    for (const f of e.fautes) {
      const cle = `${e.sourate}|${f.verset}|${f.mot}`;
      const d = derniers.get(cle);
      if (!d || e.quand > d.quand)
        derniers.set(cle, { sourate: e.sourate, verset: f.verset, mot: f.mot, quand: e.quand, reussites: 0 });
    }
  for (const m of derniers.values())
    m.reussites = essais.filter(
      (e) =>
        e.sourate === m.sourate &&
        e.quand > m.quand &&
        e.du <= m.verset &&
        e.au >= m.verset &&
        !e.fautes.some((f) => f.verset === m.verset && f.mot === m.mot),
    ).length;
  return [...derniers.values()]
    .filter((m) => m.reussites < 2)
    .sort((a, b) => (a.quand < b.quand ? 1 : a.quand > b.quand ? -1 : a.verset - b.verset))
    .slice(0, nombre);
}

/** Squelette d'un mot (lettres seules, formes de l'alif ramenées à une) : pour retrouver un mot d'un texte à l'autre. */
export function squeletteMot(mot: string): string {
  return [...mot]
    .filter((c) => /[ء-يٱ]/.test(c))
    .map((c) => (/[آأإٱا]/.test(c) ? "ا" : c === "ى" ? "ي" : c))
    .join("");
}

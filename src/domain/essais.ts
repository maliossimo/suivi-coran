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

/** Vitesse réelle mesurée sur les téléphones : règles pures. */

export type Metrique = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";

/** Seuils « bon » et « à améliorer » (au-delà : lent), ceux de web.dev. */
export const SEUILS: Record<Metrique, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export const LIBELLE_METRIQUE: Record<Metrique, string> = {
  LCP: "Affichage du contenu",
  INP: "Réaction au toucher",
  CLS: "Stabilité de la page",
  FCP: "Premier affichage",
  TTFB: "Réponse du serveur",
};

/** « /eleve/fiche?mois=… » → « /eleve/fiche » ; les identifiants deviennent « [id] ». */
export function pageGenerique(chemin: string): string {
  return (
    chemin
      .split("?")[0]!
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/[id]")
      .replace(/\/\d+(?=\/|$)/g, "/[n]")
      .slice(0, 120) || "/"
  );
}

/** Le 75e centile : la valeur que 3 visites sur 4 ne dépassent pas (référence de web.dev). */
export function centile75(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  return tri[Math.min(tri.length - 1, Math.ceil(tri.length * 0.75) - 1)] ?? null;
}

export function note(metrique: Metrique, valeur: number): "bon" | "moyen" | "lent" {
  const [bon, moyen] = SEUILS[metrique];
  return valeur <= bon ? "bon" : valeur <= moyen ? "moyen" : "lent";
}

export interface LigneVitesse {
  page: string;
  visites: number;
  lcp: number | null;
  inp: number | null;
}

/** Par page : nombre de mesures et 75e centile de l'affichage et de la réaction, les plus lentes d'abord. */
export function vitesseParPage(
  mesures: readonly { page: string; metrique: string; valeur: number }[],
): LigneVitesse[] {
  const parPage = new Map<string, { lcp: number[]; inp: number[]; visites: number }>();
  for (const m of mesures) {
    const p = parPage.get(m.page) ?? { lcp: [], inp: [], visites: 0 };
    if (m.metrique === "LCP") {
      p.lcp.push(m.valeur);
      p.visites++;
    }
    if (m.metrique === "INP") p.inp.push(m.valeur);
    parPage.set(m.page, p);
  }
  return [...parPage.entries()]
    .map(([page, p]) => ({ page, visites: p.visites, lcp: centile75(p.lcp), inp: centile75(p.inp) }))
    .filter((l) => l.lcp !== null || l.inp !== null)
    .sort((a, b) => (b.lcp ?? 0) - (a.lcp ?? 0));
}

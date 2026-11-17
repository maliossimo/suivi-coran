/**
 * Tester les enchaînements : l'appli montre la fin d'un verset, l'élève récite le début du suivant.
 * On ne pose que des enchaînements que l'élève connaît (les deux versets appris ou déclarés).
 */
import { decouperMots } from "./coran";
import { fusionner, versIntervalle, type Passage, type Referentiel } from "./versets";

export interface EnchainementPossible {
  sourate: number;
  /** Versets connus de la sourate dont le suivant est connu aussi (on montre la fin de v, on attend v + 1). */
  depuis: number[];
}

/** Les enchaînements connus, sourate par sourate (dans l'ordre du Mushaf). */
export function enchainementsConnus(ref: Referentiel, passages: readonly Passage[]): EnchainementPossible[] {
  const intervalles = fusionner(
    passages.flatMap((p) => {
      try {
        return [versIntervalle(ref, p)];
      } catch {
        return [];
      }
    }),
  );
  const connus = (index: number) => intervalles.some(([d, f]) => index >= d && index <= f);
  const resultat: EnchainementPossible[] = [];
  for (const s of [...ref.values()].sort((a, b) => a.numero - b.numero)) {
    const depuis: number[] = [];
    for (let v = 1; v < s.nbVersets; v++) {
      const i = s.premierVersetGlobal + v - 1;
      if (connus(i) && connus(i + 1)) depuis.push(v);
    }
    if (depuis.length) resultat.push({ sourate: s.numero, depuis });
  }
  return resultat;
}

/** Tire un enchaînement au hasard (en évitant de reposer le précédent quand c'est possible). */
export function tirerEnchainement(
  possibles: readonly EnchainementPossible[],
  hasard: () => number,
  precedent?: { sourate: number; verset: number } | null,
): { sourate: number; verset: number } | null {
  const tous = possibles.flatMap((p) => p.depuis.map((v) => ({ sourate: p.sourate, verset: v })));
  if (!tous.length) return null;
  const choix =
    tous.length > 1 && precedent
      ? tous.filter((x) => x.sourate !== precedent.sourate || x.verset !== precedent.verset)
      : tous;
  return choix[Math.min(choix.length - 1, Math.floor(hasard() * choix.length))]!;
}

/** Les `n` derniers mots d'un verset (sans sa rosace), précédés de « … » s'il en manque. */
export function finDuVerset(texte: string, n = 4): string {
  const mots = decouperMots(texte)
    .filter((m) => m.mot !== null)
    .map((m) => m.texte);
  return (mots.length > n ? "… " : "") + mots.slice(-n).join(" ");
}

/** Les `n` premiers mots d'un verset, suivis de « … » s'il continue. */
export function debutDuVerset(texte: string, n = 4): string {
  const mots = decouperMots(texte)
    .filter((m) => m.mot !== null)
    .map((m) => m.texte);
  return mots.slice(0, n).join(" ") + (mots.length > n ? " …" : "");
}

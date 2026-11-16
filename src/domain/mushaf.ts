/**
 * Mise en page du Mushaf de Médine (Hafs) : 15 lignes par page, coupées comme dans le livre.
 * Données : src/donnees/coran/lignes-hafs.json (voir scripts/lignes-mushaf.mjs).
 */

/** Début d'une ligne de versets. */
export interface LigneMushaf {
  sourate: number;
  verset: number;
  /** Premier mot de la ligne (1 = début du verset ; nbMots + 1 : la ligne commence par la rosace). */
  mot: number;
  /** Ligne courte (pages 1-2, fin de sourate) : centrée au lieu d'être étirée. */
  centree: boolean;
  /** Même repère dans le texte du tajwid (il découpe parfois les mots autrement). */
  motTajwid: number;
}

/** Un morceau de verset posé sur une ligne : ses mots `de` à `a` (inclus), et sa rosace si `fin`. */
export interface FragmentLigne {
  sourate: number;
  verset: number;
  de: number;
  a: number;
  fin: boolean;
  deTajwid: number;
  aTajwid: number;
}

/** Lit une entrée du fichier : [sourate, verset, mot, centree?, motTajwid?]. */
export function lireLigne(brut: readonly number[]): LigneMushaf {
  const [sourate = 1, verset = 1, mot = 1, centree = 0, motTajwid = mot] = brut;
  return { sourate, verset, mot, centree: centree === 1, motTajwid };
}

/**
 * Découpe une page en lignes de fragments. `dernierVerset(s)` : dernier verset de la sourate s affiché sur
 * la page (une ligne ne passe jamais d'une sourate à l'autre : un titre les sépare).
 */
export function fragmentsDesLignes(
  lignes: readonly LigneMushaf[],
  dernierVerset: (sourate: number) => number,
): FragmentLigne[][] {
  return lignes.map((debut, i) => {
    const suite = lignes[i + 1];
    const memeSourate = suite?.sourate === debut.sourate;
    // Dernier verset touché par la ligne, et jusqu'où.
    let jusqua: number;
    let coupe: { mot: number; motTajwid: number } | null = null;
    if (memeSourate && suite) {
      if (suite.mot > 1) {
        jusqua = suite.verset;
        coupe = { mot: suite.mot, motTajwid: suite.motTajwid };
      } else jusqua = suite.verset - 1;
    } else jusqua = dernierVerset(debut.sourate);
    const fragments: FragmentLigne[] = [];
    for (let v = debut.verset; v <= jusqua; v++) {
      const premier = v === debut.verset;
      const dernier = v === jusqua && coupe !== null;
      fragments.push({
        sourate: debut.sourate,
        verset: v,
        de: premier ? debut.mot : 1,
        a: dernier ? coupe!.mot - 1 : Infinity,
        fin: !dernier,
        deTajwid: premier ? debut.motTajwid : 1,
        aTajwid: dernier ? coupe!.motTajwid - 1 : Infinity,
      });
    }
    return fragments;
  });
}

/**
 * Garde, d'un verset découpé en morceaux (mots numérotés, espaces et signes à `null`), ceux d'un fragment :
 * ses mots, les espaces entre eux, le signe « ۞ » s'il ouvre le verset, la rosace si le fragment le termine.
 */
export function garderFragment<T extends { mot: number | null }>(
  morceaux: readonly T[],
  de: number,
  a: number,
  fin: boolean,
  estEspace: (m: T) => boolean,
): T[] {
  const garde: T[] = [];
  let precedent = 0;
  morceaux.forEach((m, i) => {
    if (m.mot !== null) {
      precedent = m.mot;
      if (m.mot >= de && m.mot <= a) garde.push(m);
      return;
    }
    const suivant = morceaux.slice(i + 1).find((x) => x.mot !== null)?.mot ?? Infinity;
    if (estEspace(m)) {
      // (Un espace avant le premier mot n'existe qu'après un signe d'ouverture comme « ۞ » : gardé avec lui.)
      if ((precedent >= de || (precedent === 0 && de === 1)) && suivant <= a) garde.push(m);
    } else if (suivant === Infinity) {
      if (fin && precedent >= de - 1) garde.push(m);
    } else if (suivant >= de && suivant <= a) garde.push(m);
  });
  return garde;
}

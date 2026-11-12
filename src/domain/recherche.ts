/**
 * Recherche d'une sourate par numéro, nom phonétique ou nom arabe.
 * Tolérante : sans accents, sans tirets ni apostrophes, avec ou sans l'article
 * (« baq », « al baqara », « 2 », « بقرة » trouvent Al-Baqara). Code pur, testé.
 */

export interface SourateCherchable {
  numero: number;
  nomLatin: string;
  nomAr: string;
}

/** Minuscules, sans accents, tirets et apostrophes remplacés par des espaces. */
export function normaliserLatin(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`ʿʾ‘]/g, "")
    .replace(/[-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ARTICLE_LATIN = /^(al|an|ar|as|at|ad|adh|az|ash|ath|aal)\s/;

/** Sans l'article de tête : « an naba » → « naba ». */
function sansArticle(texte: string): string {
  return texte.replace(ARTICLE_LATIN, "");
}

/** Arabe sans voyelles ni variantes d'alif, sans « ال » de tête. */
export function normaliserArabe(texte: string): string {
  return texte
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^ال/, "");
}

const ARABE = /[؀-ۿ]/;

/** Les sourates qui correspondent, les plus pertinentes d'abord. Texte vide : toutes. */
export function rechercherSourates<S extends SourateCherchable>(sourates: readonly S[], texte: string): S[] {
  const brut = texte.trim();
  if (!brut) return [...sourates];

  const scores = new Map<number, number>();
  const noter = (s: S, score: number) => {
    const actuel = scores.get(s.numero);
    if (actuel === undefined || score < actuel) scores.set(s.numero, score);
  };

  if (/^\d{1,3}$/.test(brut)) {
    for (const s of sourates) {
      const n = String(s.numero);
      if (n === brut) noter(s, 0);
      else if (n.startsWith(brut)) noter(s, 1);
    }
  } else if (ARABE.test(brut)) {
    const q = normaliserArabe(brut);
    for (const s of sourates) {
      const nom = normaliserArabe(s.nomAr);
      if (nom.startsWith(q)) noter(s, 1);
      else if (nom.includes(q)) noter(s, 2);
    }
  } else {
    const complet = normaliserLatin(brut);
    const q = sansArticle(complet);
    const serre = q.replace(/ /g, "");
    for (const s of sourates) {
      const nomComplet = normaliserLatin(s.nomLatin);
      const nom = sansArticle(nomComplet);
      if (nom === q) noter(s, 0);
      else if (nom.startsWith(q) || nomComplet.startsWith(complet)) noter(s, 1);
      else if (nom.includes(q)) noter(s, 2);
      else if (serre.length >= 3 && nom.replace(/ /g, "").includes(serre)) noter(s, 3);
    }
  }

  return sourates
    .filter((s) => scores.has(s.numero))
    .sort((a, b) => scores.get(a.numero)! - scores.get(b.numero)! || a.numero - b.numero);
}

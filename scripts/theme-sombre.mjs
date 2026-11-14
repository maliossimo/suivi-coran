// Thème choisi à la main (« Mon compte » → Apparence). Chaque bloc
//   @media (prefers-color-scheme: dark) { S { … } }
// de src/app/globals.css devient (CSS à plat, compris par tous les navigateurs) :
//   @media (prefers-color-scheme: dark) { :where(:root:not([data-theme="clair"])) S { … } }
//   :where(:root[data-theme="sombre"]) S { … }
// :where() n'ajoute aucune spécificité : chaque règle garde la sienne. Un sélecteur qui commence
// par « :root » ou « html » reçoit la condition sur lui-même (:root:where(…)).
// À relancer après avoir ajouté un bloc sombre : node scripts/theme-sombre.mjs (un bloc déjà converti
// est reconnu à son premier sélecteur et laissé tel quel).
import { readFileSync, writeFileSync } from "node:fs";

const FICHIER = new URL("../src/app/globals.css", import.meta.url);
const ENTETE = "@media (prefers-color-scheme: dark) {";
const AUTO = ':not([data-theme="clair"])';
const MAIN = '[data-theme="sombre"]';
/** Position de l'accolade fermante qui correspond à l'ouvrante en `debut` (chaînes et commentaires sautés). */
function fermante(css, debut) {
  let niveau = 0;
  for (let i = debut; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2) + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (c === "{") niveau++;
    if (c === "}" && --niveau === 0) return i;
  }
  throw new Error("Accolades déséquilibrées");
}

/** Un sélecteur sous condition de thème. */
function conditionner(selecteur, condition) {
  const s = selecteur.trim();
  if (/^:root(?![\w-])/.test(s)) return s.replace(/^:root/, `:root:where(${condition})`);
  if (/^html(?![\w-])/.test(s)) return s.replace(/^html/, `html:where(${condition})`);
  return `:where(:root${condition}) ${s}`;
}

/** Les règles d'un contenu, chaque sélecteur sous condition (les @media imbriqués aussi). */
function conditionnerRegles(contenu, condition) {
  let sortie = "";
  let i = 0;
  while (i < contenu.length) {
    const ouvrante = contenu.indexOf("{", i);
    if (ouvrante < 0) break;
    let tete = contenu.slice(i, ouvrante);
    // Les commentaires avant une règle sont gardés à part.
    const commentaires = tete.match(/\/\*[\s\S]*?\*\//g) ?? [];
    tete = tete.replace(/\/\*[\s\S]*?\*\//g, "");
    const fin = fermante(contenu, ouvrante);
    const corps = contenu.slice(ouvrante + 1, fin);
    const prefixe = commentaires.length ? `\n  ${commentaires.join("\n  ")}` : "";
    if (tete.trim().startsWith("@")) {
      sortie += `${prefixe}\n  ${tete.trim()} {${conditionnerRegles(corps, condition)}\n  }`;
    } else {
      const selecteurs = tete.split(",").map((x) => conditionner(x, condition)).join(",\n  ");
      sortie += `${prefixe}\n  ${selecteurs} {${corps}}`;
    }
    i = fin + 1;
  }
  return sortie;
}

let css = readFileSync(FICHIER, "utf8");
let position = 0;
let convertis = 0;
for (;;) {
  const debut = css.indexOf(ENTETE, position);
  if (debut < 0) break;
  const ouvrante = debut + ENTETE.length - 1;
  const fin = fermante(css, ouvrante);
  const contenu = css.slice(ouvrante + 1, fin);
  if (contenu.includes(`:where(${AUTO})`) || contenu.includes(`:where(:root${AUTO})`)) {
    position = fin + 1; // déjà converti
    continue;
  }
  const remplacement =
    `${ENTETE}${conditionnerRegles(contenu, AUTO)}\n}\n` +
    `/* Même chose quand le thème sombre est choisi à la main. */${conditionnerRegles(contenu, MAIN).replace(/\n  /g, "\n")}\n`;
  css = css.slice(0, debut) + remplacement + css.slice(fin + 1);
  position = debut + remplacement.length;
  convertis++;
}
writeFileSync(FICHIER, css);
console.log(`${convertis} bloc(s) sombre(s) converti(s)`);

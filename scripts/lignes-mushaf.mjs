// Mise en page du Mushaf de Médine (Hafs, 604 pages, 15 lignes) : où commence chaque ligne.
//
// Source des coupures de lignes : les pages QPC2 (édition de Médine) publiées par zonetecde/mushaf-layout,
// elles-mêmes tirées des champs `v2_page` / `line_v2` de Quran.com. On n'en garde que les coupures, recalées
// sur NOTRE texte (Complexe du Roi Fahd, Hafs v18) et sur le texte du tajwid : aucun texte n'est copié.
//
// Usage : node scripts/lignes-mushaf.mjs <dossier mushaf/QPC2>
// Écrit src/donnees/coran/lignes-hafs.json :
//   { pages: [ [ [sourate, verset, mot, centree?, motTajwid?], … ] × 604 ] }
//   - une entrée par ligne de texte (les titres de sourate et la basmala ne sont pas des lignes de versets) ;
//   - `mot` : premier mot de la ligne (1 = premier mot du verset ; nbMots + 1 = la ligne commence par la rosace) ;
//   - `centree` : 1 si la ligne est courte et se centre au lieu de s'étirer (pages 1-2, fins de sourate) ;
//   - `motTajwid` : présent seulement si le texte du tajwid ne découpe pas les mots comme le nôtre.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) throw new Error("Usage : node scripts/lignes-mushaf.mjs <dossier mushaf/QPC2>");

// Mêmes règles que src/domain/coran.ts (decouperMots / estMot).
const estMot = (t) => /[ء-يٱ-ۓ]/.test(t);
const mots = (texte) => texte.split(/\s+/).filter((m) => m.length > 0 && estMot(m));
// Squelette d'un mot : ses lettres seules (sans voyelles ni signes), formes de l'alif ramenées à une seule.
const squelette = (t) =>
  [...t]
    .filter((c) => /[ء-يٱ]/.test(c))
    .map((c) => (/[آأإٱا]/.test(c) ? "ا" : c === "ى" ? "ي" : c))
    .join("");

const texteHafs = (s) => JSON.parse(readFileSync(join(racine, `src/donnees/coran/hafs/${s}.json`), "utf8"));
const texteTajwid = (s) =>
  JSON.parse(readFileSync(join(racine, `src/donnees/coran/tajwid/${s}.json`), "utf8")).map((v) =>
    v.map((seg) => (typeof seg === "string" ? seg : seg[1])).join(""),
  );

const notre = {};
const nbVersets = {};
const tajwid = {};
for (let s = 1; s <= 114; s++) {
  const versets = texteHafs(s);
  nbVersets[s] = versets.length;
  versets.forEach((v, i) => (notre[`${s}:${i + 1}`] = mots(v)));
  texteTajwid(s).forEach((v, i) => (tajwid[`${s}:${i + 1}`] = mots(v)));
}

/**
 * Recale le mot `i` (1-based) d'un découpage source sur un autre découpage du même verset : on compare les
 * lettres cumulées, ce qui absorbe les rares mots écrits attachés d'un côté et séparés de l'autre
 * (« بعدما » / « بعد ما », « إل ياسين »…).
 */
function recaler(sourceMots, cibleMots, i) {
  if (sourceMots.length === cibleMots.length) return i;
  const avant = sourceMots
    .slice(0, i - 1)
    .map(squelette)
    .join("").length;
  let cumul = 0;
  let meilleur = 1;
  let ecart = Infinity;
  for (let j = 1; j <= cibleMots.length + 1; j++) {
    const d = Math.abs(cumul - avant);
    if (d < ecart) {
      ecart = d;
      meilleur = j;
    }
    cumul += squelette(cibleMots[j - 1] ?? "").length;
  }
  return meilleur;
}

const numero = /^[٠-٩\s]+$/;
const pages = [];
let recales = 0;
for (let p = 1; p <= 604; p++) {
  const page = JSON.parse(readFileSync(join(source, `page-${String(p).padStart(3, "0")}.json`), "utf8"));
  const lignes = page.lines;
  const sortie = [];
  // Longueur (en lettres) de chaque ligne de texte, pour repérer les lignes courtes.
  const longueurs = lignes
    .filter((l) => l.type === "text")
    .map((l) => squelette(l.words.map((w) => w.word).join("")).length);
  const pleine = [...longueurs].sort((a, b) => b - a)[Math.floor(longueurs.length / 3)] ?? 1;
  lignes.forEach((l, k) => {
    if (l.type !== "text") return;
    const premier = l.words[0];
    const [s, v, w] = premier.location.split(":").map(Number);
    const cle = `${s}:${v}`;
    // Mots de Quran.com pour ce verset (sans la rosace seule sur sa ligne).
    const sesMots = [];
    for (const pg of [p - 1, p, p + 1]) {
      if (pg < 1 || pg > 604) continue;
      const autre = JSON.parse(
        readFileSync(join(source, `page-${String(pg).padStart(3, "0")}.json`), "utf8"),
      );
      for (const ligne of autre.lines)
        if (ligne.type === "text")
          for (const m of ligne.words) {
            const [ms, mv, mw] = m.location.split(":").map(Number);
            if (ms === s && mv === v && !numero.test(m.word))
              sesMots[mw - 1] = m.word.replace(/\s*[٠-٩]+$/, "");
          }
    }
    const qc = sesMots.filter(Boolean);
    let mot;
    if (numero.test(premier.word)) mot = notre[cle].length + 1;
    else {
      mot = recaler(qc, notre[cle], w);
      if (qc.length !== notre[cle].length) recales++;
    }
    let motTajwid = mot;
    if (tajwid[cle].length !== notre[cle].length) {
      motTajwid = mot > notre[cle].length ? tajwid[cle].length + 1 : recaler(notre[cle], tajwid[cle], mot);
    }
    const longueur = squelette(l.words.map((x) => x.word).join("")).length;
    const suivante = lignes[k + 1];
    // Fin de sourate : la ligne se termine sur le dernier verset (et la suite, s'il y en a, est un titre).
    const [ds, dv] = l.words.at(-1).location.split(":").map(Number);
    const finDeSourate =
      dv === nbVersets[ds] &&
      (!suivante || suivante.type === "surah-header") &&
      !numero.test(lignes[k + 1]?.words?.[0]?.word ?? "");
    const centree = p <= 2 || (finDeSourate && longueur < pleine * 0.8);
    const entree = [s, v, mot];
    if (centree || motTajwid !== mot) entree.push(centree ? 1 : 0);
    if (motTajwid !== mot) entree.push(motTajwid);
    sortie.push(entree);
  });
  pages.push(sortie);
}

// Contrôles : chaque page commence là où notre découpage des pages l'attend, et rien ne manque.
const nosPages = JSON.parse(readFileSync(join(racine, "src/donnees/coran/pages-hafs.json"), "utf8")).pages;
pages.forEach((lignes, i) => {
  const [s, v] = nosPages[i][0];
  if (lignes[0][0] !== s || lignes[0][1] !== v)
    throw new Error(`Page ${i + 1} : début ${lignes[0]} ≠ ${s}:${v}`);
});
writeFileSync(join(racine, "src/donnees/coran/lignes-hafs.json"), JSON.stringify({ pages }) + "\n");
const total = pages.reduce((n, l) => n + l.length, 0);
console.log(
  `${total} lignes sur 604 pages ; ${recales} coupure(s) recalée(s) ; centrées :`,
  pages.flatMap((l, i) => l.filter((x) => x[3] === 1).map(() => i + 1)).length,
);

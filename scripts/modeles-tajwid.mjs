// Au déploiement (Vercel) : télécharge le modèle tajwid dans la fonction Python, pour qu'il soit prêt dès le
// premier appel (sans téléchargement à froid). Révision et empreintes figées : api/_tajwid/modeles.json.
// Le modèle compressé (int8) est aussi servi au téléphone (public/tajwid/), pour le suivi en direct, avec
// le moteur WebAssembly d'onnxruntime-web (copié à chaque build, même hors Vercel).
// Hors Vercel (sans --forcer ni TAJWID_EMBARQUER=1), le modèle n'est pas téléchargé : le moteur le télécharge
// alors au premier appel, et le téléphone suit par le serveur.
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(racine, "api/_tajwid/modeles.json"), "utf8"));
const dossier = join(racine, "api/_tajwid/modeles");

// Moteur WebAssembly du téléphone : toujours copié (même version que le paquet installé).
const publicTajwid = join(racine, "public/tajwid");
const ortDist = join(racine, "node_modules/onnxruntime-web/dist");
if (existsSync(ortDist)) {
  mkdirSync(join(publicTajwid, "ort"), { recursive: true });
  for (const f of readdirSync(ortDist).filter((f) => /^ort-wasm.*\.(wasm|mjs)$/.test(f)))
    copyFileSync(join(ortDist, f), join(publicTajwid, "ort", f));
  console.log("moteur WebAssembly du téléphone copié");
}

/** Le modèle compressé, servi au téléphone sous un nom qui change avec lui (gardé longtemps sans risque). */
function servirAuTelephone(cible, sha256) {
  mkdirSync(publicTajwid, { recursive: true });
  copyFileSync(cible, join(publicTajwid, `modele-${sha256.slice(0, 12)}.onnx`));
  console.log("modèle tajwid int8 servi au téléphone");
}

if (!process.env.VERCEL && !process.argv.includes("--forcer") && process.env.TAJWID_EMBARQUER !== "1") {
  console.log("modèle tajwid : non embarqué hors Vercel");
  process.exit(0);
}
mkdirSync(dossier, { recursive: true });
for (const [variante, { fichier, sha256 }] of Object.entries(config.variantes)) {
  const cible = join(dossier, `${variante}.onnx`);
  if (existsSync(cible)) {
    if (variante === "int8") servirAuTelephone(cible, sha256);
    continue;
  }
  const url = `https://huggingface.co/${config.depot}/resolve/${config.revision}/${fichier}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const donnees = Buffer.from(await r.arrayBuffer());
    const empreinte = createHash("sha256").update(donnees).digest("hex");
    if (!sha256 || empreinte !== sha256) throw new Error(`empreinte inattendue (${empreinte})`);
    writeFileSync(`${cible}.part`, donnees);
    renameSync(`${cible}.part`, cible);
    console.log(`modèle tajwid ${variante} embarqué (${(donnees.length / 1e6).toFixed(0)} Mo)`);
    if (variante === "int8") servirAuTelephone(cible, sha256);
  } catch (e) {
    // Le déploiement continue : le moteur téléchargera ce modèle au premier appel (--strict : échec, en CI).
    console.warn(`modèle tajwid ${variante} non embarqué : ${e instanceof Error ? e.message : e}`);
    if (process.argv.includes("--strict")) process.exitCode = 1;
  }
}

// Au déploiement (Vercel) : télécharge le modèle tajwid dans la fonction Python, pour qu'il soit prêt dès le
// premier appel (sans téléchargement à froid). Révision et empreintes figées : api/_tajwid/modeles.json.
// Hors Vercel, ne fait rien (le moteur télécharge alors le modèle au premier appel).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(racine, "api/_tajwid/modeles.json"), "utf8"));
const dossier = join(racine, "api/_tajwid/modeles");

if (!process.env.VERCEL && !process.argv.includes("--forcer")) {
  console.log("modèle tajwid : non embarqué hors Vercel");
  process.exit(0);
}
mkdirSync(dossier, { recursive: true });
for (const [variante, { fichier, sha256 }] of Object.entries(config.variantes)) {
  const cible = join(dossier, `${variante}.onnx`);
  if (existsSync(cible)) continue;
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
  } catch (e) {
    // Le déploiement continue : le moteur téléchargera ce modèle au premier appel (--strict : échec, en CI).
    console.warn(`modèle tajwid ${variante} non embarqué : ${e instanceof Error ? e.message : e}`);
    if (process.argv.includes("--strict")) process.exitCode = 1;
  }
}

#!/usr/bin/env node
/**
 * Calendrier Mawaqit d'une mosquée → SQL à exécuter dans Supabase (admin) pour remplir horaires_priere.
 *
 * 1. Ouvrir la page Mawaqit de la mosquée (ex. https://mawaqit.net/fr/m/mosquee-de-lieusaint) ;
 *    dans la console du navigateur : copy(JSON.stringify(confData.calendar))  → coller dans calendrier.json
 * 2. node scripts/horaires-mawaqit.mjs calendrier.json <id de l'établissement> [adresse-mawaqit] > horaires.sql
 * 3. Exécuter horaires.sql dans l'éditeur SQL de Supabase.
 *
 * Le calendrier est celui d'une année type : 12 mois, pour chaque jour [Fajr, Chourouq, Dhuhr, Asr, Maghrib, Icha].
 */
import { readFileSync } from "node:fs";

const [fichier, etablissement, adresse] = process.argv.slice(2);
if (!fichier || !/^[0-9a-f-]{36}$/i.test(etablissement ?? "")) {
  console.error(
    "Usage : node scripts/horaires-mawaqit.mjs calendrier.json <id établissement> [adresse-mawaqit]",
  );
  process.exit(1);
}
const calendrier = JSON.parse(readFileSync(fichier, "utf8"));
if (!Array.isArray(calendrier) || calendrier.length !== 12) throw new Error("12 mois attendus");

const minutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) throw new Error(`Heure illisible : ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
};

const lignes = [];
calendrier.forEach((jours, i) => {
  for (const [jour, heures] of Object.entries(jours)) {
    if (!Array.isArray(heures) || heures.length < 6)
      throw new Error(`Mois ${i + 1}, jour ${jour} : 6 heures attendues`);
    const v = heures.slice(0, 6).map(minutes);
    for (let k = 1; k < 6; k++)
      if (v[k] <= v[k - 1]) throw new Error(`Mois ${i + 1}, jour ${jour} : ordre des prières`);
    lignes.push(`('${etablissement}', ${i + 1}, ${Number(jour)}, ${v.join(", ")})`);
  }
});

console.log("begin;");
console.log(`delete from public.horaires_priere where etablissement_id = '${etablissement}';`);
console.log(
  "insert into public.horaires_priere (etablissement_id, mois, jour, fajr, chourouq, dhuhr, asr, maghrib, isha) values\n  " +
    lignes.join(",\n  ") +
    ";",
);
if (adresse && /^[a-z0-9-]{1,160}$/.test(adresse))
  console.log(`update public.etablissements set mawaqit = '${adresse}' where id = '${etablissement}';`);
console.log("commit;");
console.error(`${lignes.length} jours.`);

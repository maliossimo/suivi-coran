import { LIBELLE_ETAT, type CarteDuCoran, type EtatSourate } from "@/domain/carte";
import { ListeHizbARevoir } from "./ListeHizbARevoir";

const ORDRE: EtatSourate[] = ["maitrisee", "a_reviser", "en_cours", "vide"];

/**
 * Carte du Coran : les 114 sourates, chacune colorée selon son état,
 * et les hizb à réviser en priorité.
 */
export function CarteCoran({
  carte,
  aujourdhui,
  base,
}: {
  carte: CarteDuCoran;
  aujourdhui: string;
  base: string;
}) {
  return (
    <section className="carte-graphique carte-coran" aria-labelledby="carte-coran-titre">
      <h2 id="carte-coran-titre">Carte du Coran</h2>
      <p className="carte-graphique-sous">Les 114 sourates, de Al-Fatiha à An-Nas.</p>

      <ul className="carte-legende">
        {ORDRE.map((etat) => (
          <li key={etat}>
            <span className={`carte-pastille carte-${etat}`} aria-hidden="true" />
            {LIBELLE_ETAT[etat]} <b>{carte.compte[etat]}</b>
          </li>
        ))}
      </ul>

      <ol className="carte-grille">
        {carte.cases.map((c) => {
          const description = `${c.sourate.numero}. ${c.sourate.nomLatin} (${c.sourate.nomAr}) — ${LIBELLE_ETAT[c.etat]}${
            c.etat === "en_cours" ? `, ${c.pourcentage} %` : ""
          }`;
          return (
            <li key={c.sourate.numero} className={`carte-case carte-${c.etat}`} title={description}>
              <span aria-hidden="true">{c.sourate.numero}</span>
              <span className="visuellement-cache">{description}</span>
              {c.etat === "en_cours" ? (
                <span className="carte-jauge" style={{ height: `${c.pourcentage}%` }} aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <ListeHizbARevoir hizb={carte.hizb} aujourdhui={aujourdhui} base={base} />
    </section>
  );
}

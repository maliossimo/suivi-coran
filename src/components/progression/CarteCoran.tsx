import { LIBELLE_ETAT, type CarteDuCoran, type EtatSourate } from "@/domain/carte";
import { GrilleCarte } from "./GrilleCarte";
import { ListeHizbARevoir } from "./ListeHizbARevoir";

const ORDRE: EtatSourate[] = ["maitrisee", "a_reviser", "en_cours", "vide"];

/**
 * Carte du Coran : les 114 sourates, chacune colorée selon son état (toucher une case
 * ouvre son détail), et les hizb à réviser en priorité.
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
        {carte.aFaireVoir > 0 ? (
          <li>
            <span className="carte-pastille carte-pastille-a-voir" aria-hidden="true" />
            Pas encore écouté par le Cheikh <b>{carte.aFaireVoir}</b>
          </li>
        ) : null}
      </ul>

      <GrilleCarte
        base={base}
        aujourdhui={aujourdhui}
        cases={carte.cases.map((c) => ({
          numero: c.sourate.numero,
          nomLatin: c.sourate.nomLatin,
          nomAr: c.sourate.nomAr,
          nbVersets: c.sourate.nbVersets,
          etat: c.etat,
          pourcentage: c.pourcentage,
          derniereActivite: c.derniereActivite,
          aFaireVoir: c.aFaireVoir,
        }))}
      />

      <ListeHizbARevoir hizb={carte.hizb} aujourdhui={aujourdhui} base={base} />
    </section>
  );
}

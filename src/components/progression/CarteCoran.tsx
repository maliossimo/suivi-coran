import { LIBELLE_ETAT, type CarteDuCoran, type EtatSourate } from "@/domain/carte";
import { joursEntre } from "@/domain/classe";

const ORDRE: EtatSourate[] = ["maitrisee", "a_reviser", "en_cours", "vide"];

function depuis(date: string | null, aujourdhui: string): string {
  if (!date) return "jamais travaillée";
  const jours = joursEntre(date, aujourdhui);
  if (jours === 0) return "travaillée aujourd’hui";
  if (jours === 1) return "travaillée hier";
  return `travaillée il y a ${jours} jours`;
}

/**
 * Carte du Coran : les 114 sourates, chacune colorée selon son état,
 * et les sourates à réviser en priorité.
 */
export function CarteCoran({ carte, aujourdhui }: { carte: CarteDuCoran; aujourdhui: string }) {
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

      {carte.aReviserAujourdhui.length > 0 ? (
        <div className="carte-a-reviser">
          <h3>À réviser en priorité</h3>
          <ul>
            {carte.aReviserAujourdhui.map((c) => (
              <li key={c.sourate.numero}>
                <span className={`carte-pastille carte-${c.etat}`} aria-hidden="true" />
                <span className="carte-a-reviser-nom">
                  <b>
                    {c.sourate.numero}. {c.sourate.nomLatin}
                  </b>{" "}
                  <span className="arabe" lang="ar">
                    {c.sourate.nomAr}
                  </span>
                </span>
                <small>{depuis(c.derniereActivite, aujourdhui)}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="carte-graphique-sous">
          Dès qu’une sourate est connue en entier, elle apparaîtra ici quand il sera temps de la réviser.
        </p>
      )}
    </section>
  );
}

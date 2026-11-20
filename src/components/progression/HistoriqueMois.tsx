import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formaterDuree } from "@/domain/fiche";
import { variationPourcent, type BilanMois } from "@/domain/progression";

const NOM_MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

function nomDuMois(cle: string): string {
  const texte = NOM_MOIS.format(new Date(`${cle}-15T12:00:00Z`));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/**
 * Mois après mois : jours travaillés, temps et versets ajoutés, avec l'évolution du temps de travail par
 * rapport au mois d'avant (flèche et mot, pas seulement une couleur). Le mois en cours n'est pas comparé :
 * il n'est pas fini.
 */
export function HistoriqueMois({ mois }: { mois: BilanMois[] }) {
  if (mois.length < 2) return null;
  const maximum = Math.max(1, ...mois.map((m) => m.minutes));
  // Du plus récent au plus ancien.
  const lignes = [...mois].reverse().map((m, i, tous) => {
    const precedent = tous[i + 1];
    return { m, variation: i === 0 || !precedent ? null : variationPourcent(m.minutes, precedent.minutes) };
  });
  return (
    <section className="carte-graphique historique-mois">
      <h2>Mois après mois</h2>
      <p className="carte-graphique-sous">Temps de travail, jours travaillés et versets ajoutés</p>
      <ul>
        {lignes.map(({ m, variation }, i) => (
          <li key={m.cle}>
            <div className="historique-mois-tete">
              <b>{nomDuMois(m.cle)}</b>
              {i === 0 ? (
                <small className="historique-mois-encours">en cours</small>
              ) : variation === null ? null : (
                <small
                  className={`historique-mois-variation ${variation > 0 ? "hausse" : variation < 0 ? "baisse" : "stable"}`}
                >
                  {variation > 0 ? (
                    <TrendingUp size={14} aria-hidden="true" />
                  ) : variation < 0 ? (
                    <TrendingDown size={14} aria-hidden="true" />
                  ) : (
                    <Minus size={14} aria-hidden="true" />
                  )}
                  {variation > 0 ? `+${variation} %` : variation < 0 ? `${variation} %` : "stable"}
                  <span className="visuellement-cache"> de temps de travail par rapport au mois d’avant</span>
                </small>
              )}
            </div>
            <div className="historique-mois-barre" aria-hidden="true">
              <i style={{ width: `${Math.round((m.minutes / maximum) * 100)}%` }} />
            </div>
            <p className="historique-mois-chiffres">
              <span>{formaterDuree(m.minutes)}</span>
              <span>
                {m.joursTravailles} jour{m.joursTravailles > 1 ? "s" : ""}
              </span>
              <span>
                {m.versets} verset{m.versets > 1 ? "s" : ""}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

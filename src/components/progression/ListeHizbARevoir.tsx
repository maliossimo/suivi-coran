import Link from "next/link";
import { ChevronDown, RotateCcw } from "lucide-react";
import { joursEntre } from "@/domain/classe";
import { LIBELLE_REVISION, type EtatRevision, type HizbARevoir, type PortionARevoir } from "@/domain/hizb";
import { isolerArabe, passageEnTexte } from "@/domain/versets";

function ilYa(date: string, aujourdhui: string): string {
  const jours = joursEntre(date, aujourdhui);
  if (jours === 0) return "aujourd’hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} jours`;
}

function pastilleHizb(h: HizbARevoir, aujourdhui: string): string {
  if (h.etat === "a_revoir" && h.plusAncienneRevision)
    return `Il y a ${joursEntre(h.plusAncienneRevision, aujourdhui)} j`;
  return LIBELLE_REVISION[h.etat];
}

function detailPortion(p: PortionARevoir, aujourdhui: string): string {
  if (p.etat === "en_cours")
    return `en cours d’apprentissage · ${p.connus} verset${p.connus > 1 ? "s" : ""} appris`;
  if (p.etat === "jamais_revisee") {
    return p.jamaisRevises === p.connus
      ? "jamais révisée"
      : `${p.jamaisRevises} verset${p.jamaisRevises > 1 ? "s" : ""} jamais révisé${p.jamaisRevises > 1 ? "s" : ""}`;
  }
  return `révisée ${ilYa(p.plusAncienneRevision!, aujourdhui)}`;
}

const ORDRE: EtatRevision[] = ["jamais_revisee", "a_revoir", "en_cours"];

/**
 * « À réviser en priorité » : une ligne par hizb, du plus urgent au moins urgent.
 * On déroule un hizb pour voir les sourates concernées et ouvrir la révision du jour
 * avec le passage déjà rempli.
 */
export function ListeHizbARevoir({
  hizb,
  aujourdhui,
  base,
}: {
  hizb: HizbARevoir[];
  aujourdhui: string;
  /** « /eleve » ou « /maitre/eleves/{id} » : où ouvrir la séance de révision. */
  base: string;
}) {
  if (hizb.length === 0) {
    return (
      <p className="carte-graphique-sous">
        Rien à réviser en priorité : tout ce qui est appris a été révisé ces 30 derniers jours.
      </p>
    );
  }

  const compte = ORDRE.map((e) => [e, hizb.filter((h) => h.etat === e).length] as const).filter(
    ([, n]) => n > 0,
  );

  return (
    <div className="hizb-a-revoir">
      <h3>À réviser en priorité</h3>
      <p className="hizb-resume">
        {compte.map(([e, n], i) => (
          <span key={e}>
            {i > 0 ? " · " : ""}
            <b>{n}</b> {LIBELLE_REVISION[e].toLowerCase()}
          </span>
        ))}
      </p>
      <div className="hizb-liste">
        {hizb.map((h, i) => (
          <details key={h.numero} className="hizb-ligne" open={i === 0}>
            <summary>
              <span className="hizb-numero" aria-label={`Hizb ${h.numero}`}>
                <small aria-hidden="true">Hizb</small>
                <span aria-hidden="true">{h.numero}</span>
              </span>
              <span className="hizb-plage">
                {h.debut.sourate.nomLatin} {h.debut.verset} → {h.fin.sourate.nomLatin} {h.fin.verset}
              </span>
              <span className={`hizb-pastille hizb-${h.etat}`}>{pastilleHizb(h, aujourdhui)}</span>
              <ChevronDown className="hizb-chevron" size={18} aria-hidden="true" />
            </summary>
            <ul>
              {h.portions.map((p) => {
                const passage = {
                  sourateDebut: p.sourate.numero,
                  versetDebut: p.versetDebut,
                  sourateFin: p.sourate.numero,
                  versetFin: p.versetFin,
                };
                return (
                  <li key={p.sourate.numero} className={`hizb-portion hizb-${p.etat}`}>
                    <span className="hizb-portion-texte">
                      <b>{p.sourate.nomLatin}</b>{" "}
                      <span className="arabe" lang="ar">
                        {isolerArabe(p.sourate.nomAr)}
                      </span>{" "}
                      <span className="hizb-versets">
                        · {p.versetDebut} → {p.versetFin}
                      </span>
                      <small>{detailPortion(p, aujourdhui)}</small>
                    </span>
                    <Link
                      className="bouton bouton-secondaire bouton-petit"
                      href={`${base}/seance?date=${aujourdhui}&type=revision&passage=${passageEnTexte(passage)}`}
                      prefetch={false}
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      Réviser
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

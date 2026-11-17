"use client";

import { Palette } from "lucide-react";
import type { CSSProperties } from "react";
import { Feuille } from "@/components/Feuille";
import { FAMILLES_TAJWID, type FamilleTajwid } from "@/domain/coran";
import { Interrupteur } from "./Controles";

const GROUPES: { cle: FamilleTajwid["groupe"]; titre: string }[] = [
  { cle: "madd", titre: "Prolongations (madd)" },
  { cle: "noun", titre: "Nûn sâkin, tanwîn et mîm" },
  { cle: "autre", titre: "Autres règles" },
];

const TOUTES = FAMILLES_TAJWID.map((f) => f.cle);
const seules = (groupe: FamilleTajwid["groupe"] | "qalqala") =>
  TOUTES.filter((c) =>
    groupe === "qalqala" ? c !== "qalqala" : FAMILLES_TAJWID.find((f) => f.cle === c)?.groupe !== groupe,
  );

/** Raccourcis : un toucher pour ne travailler qu'une famille de règles. */
const RACCOURCIS: { libelle: string; eteintes: string[] }[] = [
  { libelle: "Toutes", eteintes: [] },
  { libelle: "Les madd", eteintes: seules("madd") },
  { libelle: "Nûn et mîm", eteintes: seules("noun") },
  { libelle: "Qalqala", eteintes: seules("qalqala") },
];

const memes = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * Panneau du tajwid : un interrupteur, des raccourcis (« seulement les madd »…), puis chaque règle en tuile à sa
 * couleur, avec ce qu'il faut faire et combien de fois elle revient sur la page. Le texte change en direct au-dessus.
 */
export function PanneauTajwid({
  ouverte,
  onFermer,
  actif,
  onActif,
  eteintes,
  onEteintes,
  compte,
}: {
  ouverte: boolean;
  onFermer: () => void;
  actif: boolean;
  onActif: (actif: boolean) => void;
  eteintes: readonly string[];
  onEteintes: (eteintes: string[]) => void;
  /** Nombre de passages de chaque règle sur la page affichée. */
  compte: ReadonlyMap<string, number>;
}) {
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Couleurs du tajwid">
      <div className="tajwid-panneau">
        <Interrupteur
          icone={<Palette size={18} aria-hidden="true" />}
          libelle="Couleurs du tajwid"
          actif={actif}
          onChange={onActif}
        />

        {actif ? (
          <>
            <div className="tajwid-raccourcis" role="group" aria-label="Raccourcis">
              {RACCOURCIS.map((r) => (
                <button
                  key={r.libelle}
                  type="button"
                  className="tajwid-raccourci"
                  aria-pressed={memes(eteintes, r.eteintes)}
                  onClick={() => onEteintes(r.eteintes)}
                >
                  {r.libelle}
                </button>
              ))}
            </div>
            <p className="tajwid-aide">
              Touche une règle pour l’allumer ou l’éteindre : la page change aussitôt.
            </p>

            {GROUPES.map((g) => (
              <section key={g.cle} className="tajwid-groupe" aria-label={g.titre}>
                <h3>{g.titre}</h3>
                <div className="tajwid-tuiles">
                  {FAMILLES_TAJWID.filter((f) => f.groupe === g.cle).map((f) => {
                    const allumee = !eteintes.includes(f.cle);
                    const n = compte.get(f.cle) ?? 0;
                    return (
                      <button
                        key={f.cle}
                        type="button"
                        className={`tajwid-tuile${allumee ? " allumee" : ""}${n ? "" : " absente"}`}
                        style={{ "--c": `var(--tj-${f.cle})` } as CSSProperties}
                        aria-pressed={allumee}
                        onClick={() =>
                          onEteintes(allumee ? [...eteintes, f.cle] : eteintes.filter((c) => c !== f.cle))
                        }
                      >
                        <span className="tajwid-tuile-haut">
                          <span className={`tj-pastille tj-${f.cle}`} aria-hidden="true" />
                          <b>{f.libelle}</b>
                        </span>
                        <span className="tajwid-tuile-aide">{f.aide}</span>
                        <span className="tajwid-tuile-bas">
                          <span lang="ar" dir="rtl">
                            {f.arabe}
                          </span>
                          <span>{n ? `${n} sur la page` : "pas sur la page"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        ) : (
          <p className="tajwid-aide">
            Allume les couleurs pour voir les règles du tajwid sur le texte : prolongations, nasalisations,
            qalqala…
          </p>
        )}
      </div>
    </Feuille>
  );
}

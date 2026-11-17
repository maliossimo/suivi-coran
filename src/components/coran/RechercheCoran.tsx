"use client";

import { useEffect, useState } from "react";
import { actionRechercherCoran } from "@/app/actions/coran";
import { squeletteMot } from "@/domain/essais";
import type { ResultatRecherche } from "@/domain/rechercheCoran";

type ResultatVerset = Extract<ResultatRecherche, { type: "verset" }>;

/** Le verset trouvé, avec les mots cherchés surlignés (comparés sans voyelles). */
function VersetTrouve({ texte, requete }: { texte: string; requete: string }) {
  const cherches = requete.split(/\s+/).map(squeletteMot).filter(Boolean);
  return (
    <>
      {texte.split(/(\s+)/).map((m, i) => {
        const s = squeletteMot(m);
        return s && cherches.some((c) => s.includes(c)) ? <mark key={i}>{m}</mark> : m;
      })}
    </>
  );
}

/** La recherche vise des versets : des lettres arabes, ou une référence « 2:255 ». */
export const chercheDesVersets = (q: string) =>
  /[ء-يٱ]/.test(q) || /^\s*\d{1,3}\s*[:.\s]\s*\d{1,3}\s*$/.test(q);

/**
 * Versets trouvés pour la recherche du menu « Aller à » (mots arabes, avec ou sans voyelles, ou référence
 * « 2:255 »). Les sourates, elles, sont trouvées par la liste du menu.
 */
export function VersetsTrouves({
  requete,
  lecture,
  onChoisir,
}: {
  requete: string;
  lecture: "hafs" | "warsh";
  onChoisir: (sourate: number, verset: number) => void;
}) {
  const [resultat, setResultat] = useState<{ q: string; versets: ResultatVerset[]; total: number } | null>(
    null,
  );
  const q = requete.trim();
  const actif = chercheDesVersets(q);

  useEffect(() => {
    if (!actif) {
      setResultat(null);
      return;
    }
    let annule = false;
    const minuteur = window.setTimeout(() => {
      void actionRechercherCoran({ q, lecture }).then((r) => {
        if (annule) return;
        const versets = r.resultats.filter((x): x is ResultatVerset => x.type === "verset");
        setResultat({ q, versets, total: r.total - (r.resultats.length - versets.length) });
      });
    }, 280);
    return () => {
      annule = true;
      window.clearTimeout(minuteur);
    };
  }, [q, actif, lecture]);

  if (!actif) return null;
  if (!resultat || resultat.q !== q)
    return (
      <ul className="recherche-coran-liste" aria-hidden="true">
        {[0, 1].map((i) => (
          <li key={i} className="squelette" style={{ height: 64 }} />
        ))}
      </ul>
    );
  if (!resultat.total) return <p className="recherche-coran-aide">Aucun verset pour « {resultat.q} ».</p>;
  return (
    <section className="recherche-coran" aria-label="Versets trouvés">
      <p className="recherche-coran-aide" role="status">
        {resultat.total > resultat.versets.length
          ? `${resultat.total} versets · les ${resultat.versets.length} premiers`
          : `${resultat.total} verset${resultat.total > 1 ? "s" : ""}`}
      </p>
      <ul className="recherche-coran-liste">
        {resultat.versets.map((r) => (
          <li key={`${r.sourate}:${r.verset}`}>
            <button type="button" onClick={() => onChoisir(r.sourate, r.verset)}>
              <span className="recherche-coran-ref">
                {r.nomLatin} · {r.sourate}:{r.verset}
              </span>
              <span lang="ar" dir="rtl" className="recherche-coran-arabe">
                <VersetTrouve texte={r.texte} requete={resultat.q} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

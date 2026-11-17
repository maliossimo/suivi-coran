"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { actionRechercherCoran } from "@/app/actions/coran";
import { Feuille } from "@/components/Feuille";
import { squeletteMot } from "@/domain/essais";
import type { ResultatRecherche } from "@/domain/rechercheCoran";

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

/**
 * Loupe du lecteur : chercher une référence (« 2:255 »), une sourate (« Maryam », « مريم ») ou des mots
 * arabes, avec ou sans voyelles. Un toucher sur un résultat ouvre le verset.
 */
export function RechercheCoran({ lecture, base }: { lecture: "hafs" | "warsh"; base: string }) {
  const [ouverte, setOuverte] = useState(false);
  const [requete, setRequete] = useState("");
  const [resultat, setResultat] = useState<{
    q: string;
    resultats: ResultatRecherche[];
    total: number;
  } | null>(null);
  const [charge, setCharge] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = requete.trim();
    if (!q) {
      setResultat(null);
      return;
    }
    let annule = false;
    setCharge(true);
    const minuteur = window.setTimeout(() => {
      void actionRechercherCoran({ q, lecture })
        .then((r) => {
          if (!annule) setResultat({ q, ...r });
        })
        .finally(() => {
          if (!annule) setCharge(false);
        });
    }, 280);
    return () => {
      annule = true;
      window.clearTimeout(minuteur);
    };
  }, [requete, lecture]);

  const lien = (r: ResultatRecherche) =>
    r.type === "sourate"
      ? `${base}?lecture=${lecture}&sourate=${r.sourate}`
      : `${base}?lecture=${lecture}&sourate=${r.sourate}#verset-${r.sourate}-${r.verset}`;

  return (
    <>
      <button
        type="button"
        className="coran-plein-ecran coran-loupe"
        onClick={() => {
          setOuverte(true);
          window.setTimeout(() => champ.current?.focus(), 250);
        }}
        aria-haspopup="dialog"
        aria-label="Rechercher dans le Coran"
        title="Rechercher : un mot, une sourate, une référence (2:255)"
      >
        <Search size={18} aria-hidden="true" />
      </button>
      <Feuille ouverte={ouverte} onFermer={() => setOuverte(false)} titre="Rechercher dans le Coran">
        <div className="recherche-coran">
          <label className="recherche-coran-champ">
            <Search size={18} aria-hidden="true" />
            <input
              ref={champ}
              type="search"
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder="الرحمن, Maryam, 2:255…"
              aria-label="Mot, sourate ou référence"
              enterKeyHint="search"
              autoComplete="off"
            />
          </label>
          {!requete.trim() ? (
            <p className="recherche-coran-aide">
              Un mot en arabe (avec ou sans voyelles), le nom d’une sourate, ou une référence comme 2:255.
            </p>
          ) : charge && !resultat ? (
            <ul className="recherche-coran-liste" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="squelette" style={{ height: 64 }} />
              ))}
            </ul>
          ) : resultat && resultat.total === 0 ? (
            <p className="recherche-coran-aide">Aucun résultat pour « {resultat.q} ».</p>
          ) : resultat ? (
            <>
              <p className="recherche-coran-aide" role="status">
                {resultat.total > resultat.resultats.length
                  ? `${resultat.total} versets · les ${resultat.resultats.length} premiers`
                  : `${resultat.total} résultat${resultat.total > 1 ? "s" : ""}`}
              </p>
              <ul className="recherche-coran-liste">
                {resultat.resultats.map((r) => (
                  <li key={r.type === "sourate" ? `s${r.sourate}` : `${r.sourate}:${r.verset}`}>
                    <Link href={lien(r)} onClick={() => setOuverte(false)}>
                      {r.type === "sourate" ? (
                        <>
                          <span className="recherche-coran-ref">Sourate {r.sourate}</span>
                          <b>{r.nomLatin}</b>
                          <span lang="ar" dir="rtl" className="recherche-coran-arabe">
                            {r.nomAr}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="recherche-coran-ref">
                            {r.nomLatin} · {r.sourate}:{r.verset}
                          </span>
                          <span lang="ar" dir="rtl" className="recherche-coran-arabe">
                            <VersetTrouve texte={r.texte} requete={resultat.q} />
                          </span>
                        </>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Feuille>
    </>
  );
}

"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { actionRechercherCoran } from "@/app/actions/coran";
import { Feuille } from "@/components/Feuille";
import { decouperMots } from "@/domain/coran";
import type { Lecture } from "@/domain/lectures";
import type { ResultatCoran } from "@/services/coran";

/**
 * Recherche dans le Coran : une loupe, puis un champ. Référence (« 2:255 »), sourate (« Maryam », « مريم ») ou
 * mots arabes, avec ou sans voyelles ; les résultats arrivent pendant la frappe.
 */
export function RechercheCoran({
  ouverte,
  onFermer,
  lecture,
}: {
  ouverte: boolean;
  onFermer: () => void;
  lecture: Lecture;
}) {
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<ResultatCoran[] | null>(null);
  const [enCours, demarrer] = useTransition();
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ouverte) requestAnimationFrame(() => champ.current?.focus());
  }, [ouverte]);

  useEffect(() => {
    const q = requete.trim();
    if (!q) return;
    const minuteur = window.setTimeout(
      () =>
        demarrer(async () => {
          setResultats(await actionRechercherCoran(lecture, q));
        }),
      250,
    );
    return () => window.clearTimeout(minuteur);
  }, [requete, lecture]);

  const vide = !requete.trim();
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Rechercher dans le Coran">
      <div className="recherche-coran">
        <label className="recherche-coran-champ">
          <Search size={18} aria-hidden="true" />
          <input
            ref={champ}
            type="search"
            enterKeyHint="search"
            value={requete}
            onChange={(e) => {
              setRequete(e.target.value);
              if (!e.target.value.trim()) setResultats(null);
            }}
            placeholder="2:255, Maryam, الرحمن…"
            aria-label="Rechercher un verset, une sourate ou des mots"
            dir="auto"
          />
        </label>
        {vide ? (
          <ul className="recherche-coran-idees" aria-label="Exemples">
            {["2:255", "Al-Kahf", "يس", "الصراط المستقيم"].map((x) => (
              <li key={x}>
                <button type="button" onClick={() => setRequete(x)} dir="auto">
                  {x}
                </button>
              </li>
            ))}
          </ul>
        ) : resultats && !resultats.length && !enCours ? (
          <p className="recherche-coran-rien">
            Rien trouvé. Essaie un seul mot, sans « ال », ou un numéro comme « 36:1 ».
          </p>
        ) : (
          <ol className="recherche-coran-resultats" aria-busy={enCours}>
            {(resultats ?? []).map((r) =>
              r.type === "sourate" ? (
                <li key={`s${r.sourate}`}>
                  <Link href={`?lecture=${lecture}&sourate=${r.sourate}`} onClick={onFermer}>
                    <span className="recherche-coran-ref">{r.sourate}</span>
                    <span>
                      <b>{r.nomLatin}</b>
                      <small>{r.nbVersets} versets</small>
                    </span>
                    <span lang="ar" dir="rtl" className="recherche-coran-nom-ar">
                      {r.nomAr}
                    </span>
                  </Link>
                </li>
              ) : (
                <li key={`v${r.sourate}:${r.verset}`}>
                  <Link
                    href={`?lecture=${lecture}&sourate=${r.sourate}&du=${r.verset}&au=${r.verset}`}
                    onClick={onFermer}
                  >
                    <span className="recherche-coran-ref">
                      {r.sourate}:{r.verset}
                    </span>
                    <span className="recherche-coran-verset">
                      <small>{r.nomLatin}</small>
                      <span lang="ar" dir="rtl" className={`recherche-coran-arabe ${lecture}`}>
                        {decouperMots(r.texte).map((m, i) =>
                          m.mot !== null && r.mots.includes(m.mot) ? <mark key={i}>{m.texte}</mark> : m.texte,
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </Feuille>
  );
}

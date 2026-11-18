"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { chiffresArabes, familleTajwid } from "@/domain/coran";
import { LIBELLE_LECTURE } from "@/domain/lectures";
import { TAILLES } from "./ReglagesCoran";
import type { BlocAffiche } from "./types";
import { lireApi } from "./lireApi";

const AUTOMATIQUES = 3;

type Reglages = {
  taille: number;
  tajwid: boolean;
  theme: string;
  tajwidEteintes?: string[];
  occidentaux?: boolean;
};

/** Mêmes réglages que la page lue (taille, tajwid, couleurs de la page) : la suite lui ressemble en tout. */
function lireReglages(): Reglages {
  try {
    const r = JSON.parse(localStorage.getItem("coran-reglages") ?? "{}") as {
      taille?: number;
      tajwid?: boolean;
      theme?: string;
      tajwidEteintes?: unknown;
      chiffres?: unknown;
    };
    return {
      taille: r.taille ?? 2,
      tajwid: Boolean(r.tajwid),
      theme: r.theme ?? "auto",
      tajwidEteintes: Array.isArray(r.tajwidEteintes)
        ? r.tajwidEteintes.filter((x) => typeof x === "string")
        : [],
      occidentaux: r.chiffres === "occidentaux",
    };
  } catch {
    return { taille: 2, tajwid: false, theme: "auto" };
  }
}

/**
 * Lecture en continu : arrivé à la fin d'une sourate, la suivante s'affiche dessous, sans changer de page
 * (trois d'affilée, puis un bouton). Chaque sourate ajoutée s'ouvre en entier (écoute, Réciter) d'un appui.
 */
export function SuiteCoran({
  lecture,
  sourate,
  base = "/admin/coran",
}: {
  lecture: "hafs" | "warsh";
  sourate: number;
  base?: string;
}) {
  const [suite, setSuite] = useState<BlocAffiche[]>([]);
  const [charge, setCharge] = useState(false);
  const [reglages, setReglages] = useState<Reglages>({ taille: 2, tajwid: false, theme: "auto" });
  /** La suite ne vient que si l'on fait défiler (pas à l'ouverture d'une sourate courte). */
  const [defile, setDefile] = useState(false);
  const sentinelle = useRef<HTMLDivElement>(null);
  const derniere = suite.at(-1)?.sourate ?? sourate;
  const fin = derniere >= 114;
  const automatique = suite.length < AUTOMATIQUES;

  useEffect(() => setReglages(lireReglages()), []);
  useEffect(() => {
    const surDefilement = () => window.scrollY > 40 && setDefile(true);
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  const charger = async () => {
    if (charge || fin) return;
    setCharge(true);
    const bloc = await lireApi<BlocAffiche | null>(
      "/api/coran/suite",
      { lecture, sourate: String(derniere) },
      null,
    );
    if (bloc) setSuite((s) => [...s, bloc]);
    setCharge(false);
  };

  useEffect(() => {
    const el = sentinelle.current;
    if (!el || fin || !automatique || charge || !defile) return;
    const obs = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && void charger(), {
      rootMargin: "300px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger à chaque nouvelle sourate ajoutée
  }, [derniere, fin, automatique, charge, defile]);

  return (
    <div className="coran-suite">
      {suite.map((b) => (
        <section
          key={b.sourate}
          className="coran-suite-bloc"
          data-sous-titre={`${b.sourate}. ${b.nomLatin}`}
          aria-label={`Sourate ${b.sourate}, ${b.nomLatin}`}
        >
          <header className={`coran-cartouche coran-${lecture}`}>
            <p lang="ar" dir="rtl">
              سورة {b.nomAr}
            </p>
            {/* Même cartouche que la sourate ouverte ; le lien ouvre celle-ci (écoute, Réciter). */}
            <span>
              {b.sourate}. {b.nomLatin} · {b.nbVersets} versets · {LIBELLE_LECTURE[lecture]} ·{" "}
              <Link href={`${base}?lecture=${lecture}&sourate=${b.sourate}`}>ouvrir</Link>
            </span>
          </header>
          <article
            className={[
              "coran-page",
              `coran-${lecture}`,
              reglages.tajwid ? "coran-tajwid" : "",
              ...(reglages.tajwid ? (reglages.tajwidEteintes ?? []).map((f) => `sans-tj-${f}`) : []),
              reglages.theme !== "auto" ? `theme-${reglages.theme}` : "",
            ].join(" ")}
            lang="ar"
            dir="rtl"
            style={{ "--taille-coran": `${TAILLES[reglages.taille] ?? 30}px` } as CSSProperties}
          >
            {b.basmala ? <p className="coran-basmala">{b.basmala}</p> : null}
            <p className="coran-versets">
              {b.versets.map((v) => (
                <span key={v.n} className="coran-verset">
                  {reglages.tajwid && v.tajwid
                    ? v.tajwid.map((s, j) =>
                        typeof s === "string" ? (
                          s
                        ) : (
                          <span key={j} className={`tj tj-${familleTajwid(s[0]) ?? "aucune"}`}>
                            {s[1]}
                          </span>
                        ),
                      )
                    : reglages.occidentaux
                      ? v.texte.replace(/\s*[\u0660-\u0669]+\s*$/, "")
                      : v.texte}
                  {/* Numéro : rosace comme dans la page ouverte (police du Complexe), ou chiffres occidentaux. */}
                  {reglages.occidentaux ? (
                    <>
                      {"\u00a0"}
                      <span className="numero-occidental">{v.n}</span>
                    </>
                  ) : reglages.tajwid && v.tajwid ? (
                    `\u00a0${chiffresArabes(v.n)}`
                  ) : (
                    ""
                  )}{" "}
                </span>
              ))}
            </p>
          </article>
        </section>
      ))}
      {fin ? null : (
        <div ref={sentinelle} className="coran-suite-pied">
          {automatique ? (
            <span className="carte-graphique-sous">{charge ? "La sourate suivante arrive…" : ""}</span>
          ) : (
            <button
              type="button"
              className="bouton-secondaire"
              disabled={charge}
              onClick={() => void charger()}
            >
              {charge ? "Chargement…" : "Continuer avec la sourate suivante"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

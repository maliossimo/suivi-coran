"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Headphones,
  Minus,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { actionApercuEleve } from "@/app/actions/classe";
import { Feuille } from "@/components/Feuille";
import { formaterDuree, libelleJourCourt } from "@/domain/fiche";
import type { SemaineTendance, SensTendance } from "@/domain/tendance";
import type { ApercuEleve as Apercu } from "@/services/apercuEleve";

const SENS: Record<SensTendance, { libelle: string; Icone: typeof ArrowUpRight; classe: string }> = {
  hausse: { libelle: "En progrès ces 4 dernières semaines", Icone: ArrowUpRight, classe: "tendance-hausse" },
  stable: { libelle: "Régulier ces 4 dernières semaines", Icone: ArrowRight, classe: "tendance-stable" },
  baisse: { libelle: "En baisse ces 4 dernières semaines", Icone: ArrowDownRight, classe: "tendance-baisse" },
  aucune: { libelle: "Pas de séance ces 8 dernières semaines", Icone: Minus, classe: "tendance-aucune" },
};

/**
 * Aperçu rapide d'un élève, sans quitter la liste : sa progression, sa tendance sur 8 semaines,
 * sa dernière séance et ce qui est à refaire ; un bouton ouvre sa fiche complète.
 */
export function ApercuEleve({
  eleve,
  lienFiche,
  aVoir,
  onEcouter,
  onFermer,
}: {
  eleve: { id: string; prenom: string; nom: string } | null;
  lienFiche: string;
  aVoir: number;
  onEcouter: () => void;
  onFermer: () => void;
}) {
  /** Réponse reçue, rangée sous l'élève demandé (une réponse d'un autre élève ne s'affiche pas). */
  const [recu, setRecu] = useState<{ id: string; valeur: Apercu | "erreur" } | null>(null);

  useEffect(() => {
    if (!eleve) return;
    let actif = true;
    const id = eleve.id;
    void actionApercuEleve(id)
      .then((d) => {
        if (actif) setRecu({ id, valeur: d ?? "erreur" });
      })
      .catch(() => {
        if (actif) setRecu({ id, valeur: "erreur" });
      });
    return () => {
      actif = false;
    };
  }, [eleve]);

  const donnees = eleve && recu?.id === eleve.id ? recu.valeur : null;
  const d = donnees && donnees !== "erreur" ? donnees : null;
  return (
    <Feuille
      ouverte={eleve !== null}
      onFermer={onFermer}
      titre={eleve ? `${eleve.prenom} ${eleve.nom}`.trim() : "Élève"}
    >
      {donnees === "erreur" ? (
        <p className="message-erreur">L’aperçu n’a pas pu être chargé. Ouvre sa fiche.</p>
      ) : !d ? (
        <div className="apercu-eleve" aria-busy="true">
          <div className="squelette" style={{ height: 64 }} />
          <div className="squelette" style={{ height: 120 }} />
          <div className="squelette" style={{ height: 80 }} />
        </div>
      ) : (
        <div className="apercu-eleve">
          <div className="apercu-chiffres">
            <div>
              <strong>{d.pourcentage.toLocaleString("fr-FR")} %</strong>
              <span>du Coran</span>
            </div>
            {d.pages !== null ? (
              <div>
                <strong>{Math.round(d.pages)}</strong>
                <span>pages</span>
              </div>
            ) : null}
            <div>
              <strong>{d.juz ?? 0}</strong>
              <span>juz complet{(d.juz ?? 0) > 1 ? "s" : ""}</span>
            </div>
            {d.motsARevoir ? (
              <div>
                <strong>{d.motsARevoir}</strong>
                <span>mot{d.motsARevoir > 1 ? "s" : ""} à revoir</span>
              </div>
            ) : null}
          </div>

          <section className="apercu-tendance" aria-label="Tendance sur 8 semaines">
            <TendanceSemaines semaines={d.tendance.semaines} />
            <p className={`apercu-sens ${SENS[d.tendance.sens].classe}`}>
              {(() => {
                const { Icone, libelle } = SENS[d.tendance.sens];
                return (
                  <>
                    <Icone size={16} aria-hidden="true" /> {libelle}
                  </>
                );
              })()}
            </p>
          </section>

          {d.derniere ? (
            <section className="apercu-bloc">
              <h3>
                Dernière séance · {d.derniere.type === "apprentissage" ? "apprentissage" : "révision"} ·{" "}
                {libelleJourCourt(d.derniere.date)}
                {d.derniere.dureeMin ? ` · ${formaterDuree(d.derniere.dureeMin)}` : ""}
              </h3>
              <ul>
                {d.derniere.passages.map((p, i) => (
                  <li key={i}>
                    <span>{p.libelle}</span>
                    <span
                      className={`pastille-etat etat-${p.etat === "a_refaire" ? "ecoute" : p.etat === "valide" ? "valide" : "a-ecouter"}`}
                    >
                      {p.etat === "valide"
                        ? "✓ Validé"
                        : p.etat === "a_refaire"
                          ? "↺ À refaire"
                          : "Pas encore passé"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="carte-graphique-sous">Pas encore de séance.</p>
          )}

          {d.aRefaire.length ? (
            <section className="apercu-bloc">
              <h3>
                <RotateCcw size={15} aria-hidden="true" /> À refaire
              </h3>
              <p className="apercu-liste">{d.aRefaire.join(" · ")}</p>
            </section>
          ) : null}

          <div className="apercu-actions">
            {aVoir ? (
              <button type="button" className="bouton-secondaire" onClick={onEcouter}>
                <Headphones size={18} aria-hidden="true" /> {aVoir} à écouter
              </button>
            ) : null}
            <Link href={lienFiche} className="bouton" onClick={onFermer}>
              Ouvrir sa fiche <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </Feuille>
  );
}

/** 8 semaines de travail : une barre par semaine (minutes), la courante à droite, en couleur. */
function TendanceSemaines({ semaines }: { semaines: SemaineTendance[] }) {
  const max = Math.max(30, ...semaines.map((s) => s.minutes));
  const L = 28;
  const H = 64;
  const total = semaines.reduce((t, s) => t + s.minutes, 0);
  return (
    <svg
      className="apercu-courbe"
      viewBox={`0 0 ${semaines.length * L} ${H + 16}`}
      role="img"
      aria-label={`Travail des 8 dernières semaines : ${formaterDuree(total)} au total`}
    >
      {semaines.map((s, i) => {
        const h = s.minutes ? Math.max(4, (s.minutes / max) * H) : 2;
        return (
          <g key={s.debut}>
            <rect
              x={i * L + 5}
              y={H - h}
              width={L - 10}
              height={h}
              rx={4}
              className={i === semaines.length - 1 ? "barre-courante" : s.minutes ? "barre" : "barre-vide"}
            >
              <title>
                Semaine du {libelleJourCourt(s.debut)} :{" "}
                {s.minutes ? formaterDuree(s.minutes) : "aucune séance"}
                {s.versets ? `, ${s.versets} versets appris` : ""}
              </title>
            </rect>
            {s.versets ? (
              <circle cx={i * L + L / 2} cy={H - h - 6} r={2.5} className="point-versets" />
            ) : null}
            <text x={i * L + L / 2} y={H + 13} textAnchor="middle" className="etiquette-semaine">
              {i === semaines.length - 1 ? "auj." : `S-${semaines.length - 1 - i}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

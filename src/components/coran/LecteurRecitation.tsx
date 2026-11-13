"use client";

import { useEffect, useMemo, useState } from "react";

interface Recitateur {
  id: string;
  nom: string;
  style: string;
  serveur: string;
}

/** Récitateurs proposés en premier s'ils sont disponibles. */
const PREFERES = ["husary", "hussary", "alafasy", "afasy", "minshawi", "abdulbasit", "abdul basit"];

function parDefaut(liste: Recitateur[]): Recitateur | undefined {
  for (const p of PREFERES) {
    const r = liste.find((x) =>
      x.nom.toLowerCase().replace(/[-']/g, " ").replace(/\s+/g, "").includes(p.replace(/\s/g, "")),
    );
    if (r) return r;
  }
  return liste[0];
}

/** Écouter la sourate affichée, avec le récitateur choisi (choix gardé sur l'appareil, par lecture). */
export function LecteurRecitation({
  lecture,
  sourate,
  recitateurs,
}: {
  lecture: string;
  sourate: number;
  recitateurs: Recitateur[] | null;
}) {
  const cle = `recitateur-${lecture}`;
  const liste = useMemo(() => recitateurs ?? [], [recitateurs]);
  const [choisi, setChoisi] = useState<string | undefined>(undefined);

  useEffect(() => {
    let memorise: string | null = null;
    try {
      memorise = localStorage.getItem(cle);
    } catch {
      // stockage indisponible
    }
    setChoisi(liste.some((r) => r.id === memorise) ? (memorise ?? undefined) : parDefaut(liste)?.id);
  }, [cle, liste]);

  if (recitateurs === null) {
    return <p className="message-info">Les récitations sont momentanément indisponibles.</p>;
  }
  if (liste.length === 0) {
    return <p className="message-info">Aucune récitation de cette sourate dans cette lecture.</p>;
  }

  const recitateur = liste.find((r) => r.id === choisi);
  const fichier = recitateur ? `${recitateur.serveur}${String(sourate).padStart(3, "0")}.mp3` : undefined;

  return (
    <section className="coran-lecteur" aria-label="Récitation">
      <label className="champ">
        <span>Récitateur ({liste.length})</span>
        <select
          value={choisi ?? ""}
          onChange={(e) => {
            setChoisi(e.target.value);
            try {
              localStorage.setItem(cle, e.target.value);
            } catch {
              // stockage indisponible
            }
          }}
        >
          {liste.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
              {r.style ? ` · ${r.style}` : ""}
            </option>
          ))}
        </select>
      </label>
      {fichier ? <audio key={fichier} controls preload="none" src={fichier} className="coran-audio" /> : null}
    </section>
  );
}

"use client";

import { ArrowDown, ArrowUp, Check, GripVertical } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Cartes d'un accueil que chacun range à son goût : « Réorganiser », puis ↑ / ↓ sur chaque carte.
 * L'ordre est retenu sur l'appareil ; une carte nouvelle se place à la fin.
 */
export function CartesDeplacables({
  cle,
  cartes,
  className,
}: {
  /** Nom de l'accueil (clé de stockage). */
  cle: string;
  cartes: { id: string; titre: string; contenu: ReactNode }[];
  className?: string;
}) {
  const ids = cartes.map((c) => c.id);
  const [ordre, setOrdre] = useState<string[]>(ids);
  const [edition, setEdition] = useState(false);
  const stockage = `ordre-cartes-${cle}`;

  useEffect(() => {
    try {
      const garde = JSON.parse(localStorage.getItem(stockage) ?? "[]") as unknown;
      if (Array.isArray(garde)) {
        const connus = garde.filter((x): x is string => typeof x === "string" && ids.includes(x));
        setOrdre([...connus, ...ids.filter((x) => !connus.includes(x))]);
      }
    } catch {
      // stockage indisponible : ordre par défaut
    }
    // Les identifiants sont fixes pour un accueil donné.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockage]);

  const deplacer = (id: string, pas: -1 | 1) => {
    setOrdre((o) => {
      const i = o.indexOf(id);
      const j = i + pas;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j]!, n[i]!];
      try {
        localStorage.setItem(stockage, JSON.stringify(n));
      } catch {
        // l'ordre vaut pour cette visite
      }
      return n;
    });
  };

  const parId = new Map(cartes.map((c) => [c.id, c]));
  return (
    <div className={["cartes-deplacables", edition ? "en-edition" : "", className ?? ""].join(" ")}>
      {ordre.map((id, i) => {
        const c = parId.get(id);
        if (!c) return null;
        return (
          <div key={id} className="carte-deplacable">
            {edition ? (
              <div className="carte-deplacable-barre">
                <GripVertical size={16} aria-hidden="true" />
                <span>{c.titre}</span>
                <button
                  type="button"
                  onClick={() => deplacer(id, -1)}
                  disabled={i === 0}
                  aria-label={`Monter « ${c.titre} »`}
                >
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(id, 1)}
                  disabled={i === ordre.length - 1}
                  aria-label={`Descendre « ${c.titre} »`}
                >
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
              </div>
            ) : null}
            {c.contenu}
          </div>
        );
      })}
      <button
        type="button"
        className="lien-discret cartes-deplacables-bouton"
        onClick={() => setEdition((e) => !e)}
      >
        {edition ? (
          <>
            <Check size={15} aria-hidden="true" /> Terminé
          </>
        ) : (
          <>
            <GripVertical size={15} aria-hidden="true" /> Réorganiser les cartes
          </>
        )}
      </button>
    </div>
  );
}

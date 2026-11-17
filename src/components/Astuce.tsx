"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const CLE = "astuces-vues";

function vues(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Une astuce montrée au bon moment, une seule fois : elle disparaît d'un toucher (« J'ai compris »)
 * et ne revient plus sur cet appareil.
 */
export function Astuce({ id, children }: { id: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Après l'affichage de la page : l'astuce arrive en douceur, jamais avant le contenu.
    const t = window.setTimeout(() => setVisible(!vues().includes(id)), 600);
    return () => window.clearTimeout(t);
  }, [id]);
  if (!visible) return null;
  const fermer = () => {
    setVisible(false);
    try {
      localStorage.setItem(CLE, JSON.stringify([...vues(), id]));
    } catch {
      // pas de stockage : elle reviendra à la prochaine visite
    }
  };
  return (
    <p className="coran-astuce astuce" role="note">
      <span>
        <b>Astuce :</b> {children}
      </span>
      <button type="button" onClick={fermer} aria-label="J’ai compris">
        <X size={16} aria-hidden="true" />
      </button>
    </p>
  );
}

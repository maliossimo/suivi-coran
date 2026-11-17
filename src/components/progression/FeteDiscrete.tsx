"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const CLE = "fetes-vues";

/**
 * Une petite fête, discrète : quand une sourate ou un juz vient d'être terminé, une seule ligne dorée,
 * traversée d'un reflet, en haut de la progression. Une seule fois par étape ; ce qui était déjà
 * terminé avant la première visite n'est pas fêté.
 */
export function FeteDiscrete({
  sourates,
  juz,
}: {
  sourates: { numero: number; nom: string }[];
  juz: number;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const ids = [
      ...sourates.map((s) => `s${s.numero}`),
      ...Array.from({ length: juz }, (_, i) => `j${i + 1}`),
    ];
    let vues: string[] | null = null;
    try {
      const brut = localStorage.getItem(CLE);
      vues = brut ? (JSON.parse(brut) as string[]) : null;
      localStorage.setItem(CLE, JSON.stringify(ids));
    } catch {
      return;
    }
    if (!vues) return; // première visite : on retient sans fêter
    const nouvellesSourates = sourates.filter((s) => !vues!.includes(`s${s.numero}`));
    const nouveauJuz = ids.some((id) => id.startsWith("j") && !vues!.includes(id));
    const parties = [
      nouvellesSourates.length === 1
        ? `Sourate ${nouvellesSourates[0]!.nom} terminée`
        : nouvellesSourates.length > 1
          ? `${nouvellesSourates.length} sourates terminées`
          : null,
      nouveauJuz ? `${juz} juz complet${juz > 1 ? "s" : ""}` : null,
    ].filter(Boolean);
    if (parties.length) setMessage(parties.join(" · "));
  }, [sourates, juz]);

  if (!message) return null;
  return (
    <p className="fete-discrete" role="status">
      <Sparkles size={18} aria-hidden="true" />
      <span>
        {message} · <span lang="ar">بارك الله فيك</span>
      </span>
      <button type="button" onClick={() => setMessage(null)} aria-label="Fermer">
        <X size={16} aria-hidden="true" />
      </button>
    </p>
  );
}

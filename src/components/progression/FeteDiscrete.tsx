"use client";

import { X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

const CLE = "fetes-vues";

/**
 * Une fête à l'image de l'appli : quand une sourate ou un juz vient d'être terminé, une étoile de zellige
 * dorée s'ouvre en haut de la progression ; pour un juz, la carte prend un cadre enluminé comme une page
 * de Mushaf. Une seule fois par étape ; ce qui était déjà
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
  const [juzFete, setJuzFete] = useState(false);

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
    if (parties.length) {
      setMessage(parties.join(" · "));
      setJuzFete(nouveauJuz);
    }
  }, [sourates, juz]);

  if (!message) return null;
  return (
    <div className={juzFete ? "fete-zellige fete-juz" : "fete-zellige"} role="status">
      {/* Une étoile de zellige s'ouvre, des éclats dorés s'en échappent. */}
      <svg className="fete-etoile" viewBox="0 0 100 100" aria-hidden="true">
        <g className="fete-etoile-corps">
          <rect x="25" y="25" width="50" height="50" />
          <rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="13" />
        </g>
        {Array.from({ length: 8 }, (_, i) => (
          <circle
            key={i}
            className="fete-eclat"
            cx="50"
            cy="50"
            r="2.4"
            style={{ "--angle": `${i * 45}deg`, animationDelay: `${0.35 + i * 0.03}s` } as CSSProperties}
          />
        ))}
      </svg>
      <p className="fete-texte">
        <span className="fete-dua" lang="ar" dir="rtl">
          بارك الله فيك
        </span>
        <span>{message}</span>
      </p>
      <button type="button" onClick={() => setMessage(null)} aria-label="Fermer">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

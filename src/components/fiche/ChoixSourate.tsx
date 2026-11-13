"use client";

import { useMemo } from "react";
import { Selecteur, type OptionSelecteur } from "@/components/Selecteur";
import { rechercherSourates } from "@/domain/recherche";
import { isolerArabe } from "@/domain/versets";

export interface SourateChoix {
  numero: number;
  nomLatin: string;
  nomAr: string;
}

/**
 * Choix d'une sourate avec recherche : on tape « baq », « 2 » ou « بقرة »
 * au lieu de faire défiler 114 lignes.
 */
export function ChoixSourate({
  libelle,
  valeur,
  sourates,
  onChoix,
}: {
  libelle: string;
  valeur: number;
  sourates: readonly SourateChoix[];
  onChoix: (numero: number) => void;
}) {
  const options = useMemo<OptionSelecteur[]>(
    () =>
      sourates.map((s) => ({
        valeur: String(s.numero),
        prefixe: String(s.numero),
        libelle: s.nomLatin,
        arabe: isolerArabe(s.nomAr),
      })),
    [sourates],
  );
  const parNumero = useMemo(() => new Map(sourates.map((s) => [String(s.numero), s])), [sourates]);

  return (
    <div className="champ choix-sourate">
      <span>{libelle}</span>
      <Selecteur
        titre={libelle}
        options={options}
        valeur={String(valeur)}
        onChange={(v) => onChoix(Number(v))}
        vide="Choisir une sourate"
        recherche={(opts, texte) => {
          const trouvees = rechercherSourates(
            opts.map((o) => parNumero.get(o.valeur)!),
            texte,
          ).map((s) => String(s.numero));
          const parValeur = new Map(opts.map((o) => [o.valeur, o]));
          return trouvees.map((v) => parValeur.get(v)!);
        }}
        placeholderRecherche="Nom ou numéro : baq, 2, بقرة…"
        focusRecherche
      />
    </div>
  );
}

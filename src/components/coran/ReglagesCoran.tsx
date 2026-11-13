"use client";

import { CloudDownload, CloudOff, Minus, Palette, Plus, ScanEye, TextCursor, Trash2 } from "lucide-react";
import Link from "next/link";
import { Feuille } from "@/components/Feuille";
import { LIBELLE_LECTURE } from "@/domain/lectures";
import { Choix, Interrupteur } from "./Controles";
import { taille, useHorsLigne } from "./horsLigne";
import type { RecitationAffichee } from "./types";

export interface Reglages {
  recitation: Record<string, string>;
  vitesse: number;
  suivre: boolean;
  tajwid: boolean;
  motParMot: boolean;
  taille: number;
}

export const TAILLES = [22, 26, 30, 34, 40, 46];
const VITESSES = [0.75, 1, 1.25, 1.5];

/** Feuille des réglages : récitation, affichage, hors ligne. */
export function ReglagesCoran({
  ouverte,
  onFermer,
  lecture,
  liensLecture,
  vue,
  reglages,
  modifier,
  recitations,
  recitation,
  bibliothequeDisponible,
  horsLigne,
}: {
  ouverte: boolean;
  onFermer: () => void;
  lecture: "hafs" | "warsh";
  liensLecture: Record<"hafs" | "warsh", string>;
  vue: "sourate" | "page";
  reglages: Reglages;
  modifier: (m: Partial<Reglages>) => void;
  recitations: RecitationAffichee[];
  recitation: RecitationAffichee | null;
  bibliothequeDisponible: boolean;
  horsLigne: ReturnType<typeof useHorsLigne>;
}) {
  const groupes = [
    { libelle: "Le texte suit la récitation", liste: recitations.filter((r) => r.suivi) },
    { libelle: "Écoute seule (sourate entière)", liste: recitations.filter((r) => !r.suivi) },
  ];

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Réglages">
      <section className="feuille-section">
        <h3>Lecture</h3>
        <nav className="coran-segments" aria-label="Lecture">
          {(["hafs", "warsh"] as const).map((l) => (
            <Link
              key={l}
              href={liensLecture[l]}
              aria-current={l === lecture ? "page" : undefined}
              scroll={false}
              replace
            >
              {LIBELLE_LECTURE[l]}
            </Link>
          ))}
        </nav>
      </section>

      <section className="feuille-section">
        <h3>Récitation</h3>
        <label className="coran-reglage">
          <span>Récitateur</span>
          <select
            value={recitation?.id ?? ""}
            onChange={(e) => modifier({ recitation: { ...reglages.recitation, [lecture]: e.target.value } })}
          >
            {groupes.map((g) =>
              g.liste.length ? (
                <optgroup key={g.libelle} label={g.libelle}>
                  {g.liste.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                      {r.style ? ` · ${r.style}` : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null,
            )}
          </select>
          {recitation && !recitation.suivi ? (
            <small>Écoute seule : le texte ne suit pas cette récitation.</small>
          ) : null}
          {!bibliothequeDisponible ? (
            <small>Les récitations « sourate entière » sont momentanément indisponibles.</small>
          ) : null}
        </label>
        <Choix
          libelle="Vitesse"
          valeurs={VITESSES}
          valeur={reglages.vitesse}
          afficher={(v) => `${String(v).replace(".", ",")}×`}
          onChange={(v) => modifier({ vitesse: v })}
        />
      </section>

      <section className="feuille-section">
        <h3>Affichage</h3>
        <div className="coran-reglage">
          <span>Taille du texte</span>
          <div className="coran-choix-ligne" role="group" aria-label="Taille du texte">
            <button
              type="button"
              onClick={() => modifier({ taille: Math.max(0, reglages.taille - 1) })}
              disabled={reglages.taille === 0}
              aria-label="Texte plus petit"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span
              className="coran-taille-apercu"
              lang="ar"
              style={{ fontSize: `${Math.round((TAILLES[reglages.taille] ?? 30) * 0.8)}px` }}
            >
              بِسْمِ
            </span>
            <button
              type="button"
              onClick={() => modifier({ taille: Math.min(TAILLES.length - 1, reglages.taille + 1) })}
              disabled={reglages.taille === TAILLES.length - 1}
              aria-label="Texte plus grand"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="coran-interrupteurs">
          {lecture === "hafs" ? (
            <Interrupteur
              icone={<Palette size={18} aria-hidden="true" />}
              libelle="Couleurs du tajwid"
              actif={reglages.tajwid}
              onChange={(v) => modifier({ tajwid: v })}
            />
          ) : null}
          <Interrupteur
            icone={<ScanEye size={18} aria-hidden="true" />}
            libelle="Garder le verset récité à l’écran"
            actif={reglages.suivre}
            desactive={!recitation?.suivi}
            onChange={(v) => modifier({ suivre: v })}
          />
          <Interrupteur
            icone={<TextCursor size={18} aria-hidden="true" />}
            libelle={lecture === "hafs" ? "Surligner mot par mot" : "Mot par mot (Hafs seulement)"}
            actif={reglages.motParMot && Boolean(recitation?.mots)}
            desactive={!recitation?.mots}
            onChange={(v) => modifier({ motParMot: v })}
          />
        </div>
      </section>

      {horsLigne.possible ? (
        <section className="feuille-section coran-hors-ligne">
          <h3>
            <CloudOff size={16} aria-hidden="true" /> Hors ligne
          </h3>
          {vue === "sourate" ? (
            recitation?.suivi && recitation.dossier ? (
              horsLigne.sourateTelechargee ? (
                <div className="coran-hors-ligne-ligne">
                  <span>✓ Récitation de cette sourate sur le téléphone ({recitation.nom})</span>
                  <button
                    type="button"
                    className="coran-bouton"
                    onClick={() => void horsLigne.supprimerSourate()}
                    aria-label="Retirer du téléphone"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="bouton-secondaire"
                  disabled={horsLigne.progres !== null}
                  onClick={() => void horsLigne.telechargerSourate()}
                >
                  <CloudDownload size={16} aria-hidden="true" />
                  Télécharger la récitation de cette sourate
                </button>
              )
            ) : (
              <small>Choisis un récitateur « le texte suit » pour télécharger la récitation.</small>
            )
          ) : null}
          {horsLigne.texteGarde ? (
            <small>✓ Texte des 114 sourates ({LIBELLE_LECTURE[lecture]}) gardé sur le téléphone.</small>
          ) : null}
          <button
            type="button"
            className="bouton-secondaire"
            disabled={horsLigne.progres !== null}
            onClick={() => void horsLigne.garderTexte()}
          >
            <CloudDownload size={16} aria-hidden="true" />
            {horsLigne.texteGarde ? "Mettre à jour le texte gardé" : "Garder tout le texte sur le téléphone"}
          </button>
          {horsLigne.progres ? (
            <div className="coran-progres" role="status">
              <span>
                {horsLigne.progres.quoi === "texte" ? "Texte" : "Récitation"} : {horsLigne.progres.fait} /{" "}
                {horsLigne.progres.total}
              </span>
              <progress value={horsLigne.progres.fait} max={horsLigne.progres.total} />
            </div>
          ) : null}
          {horsLigne.erreur ? <small className="erreur">{horsLigne.erreur}</small> : null}
          {horsLigne.place !== null ? (
            <small>Place utilisée par l’appli : {taille(horsLigne.place)}</small>
          ) : null}
        </section>
      ) : null}
    </Feuille>
  );
}

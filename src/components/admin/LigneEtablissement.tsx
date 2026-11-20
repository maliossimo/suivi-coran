"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  actionPlacerEtablissement,
  actionRelierMawaqit,
  actionRenommerEtablissement,
  actionSupprimerEtablissement,
} from "@/app/actions/admin";
import type { EtatSaisie } from "@/app/actions/fiche";
import { confirmationValide } from "@/domain/classe";
import type { EtablissementUsage } from "@/domain/usage";
import { Check } from "lucide-react";

const JOURS = ["", "lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

/** Un établissement : voir la classe, renommer, supprimer (vide seulement, en retapant son nom). */
export function LigneEtablissement({
  id,
  nom,
  maitres,
  eleves,
  comptes,
  activite,
  classes = [],
  position = null,
  mawaqit = null,
}: {
  id: string;
  nom: string;
  maitres: number;
  eleves: number;
  /** Tous les comptes rattachés, archivés compris. */
  comptes: number;
  /** Activité récente (élèves actifs, séances à voir…). */
  activite?: EtablissementUsage;
  /** Classes en cours de l'établissement. */
  classes?: { id: string; nom: string; jours: number[]; cheikhs: { nom: string }[]; nbMembres: number }[];
  /** Position de la mosquée (heures de prière du ciel de la barre), null si pas encore placée. */
  position?: { latitude: number; longitude: number } | null;
  /** Page Mawaqit reliée (horaires mis à jour chaque mois), null sinon. */
  mawaqit?: { adresse: string; importeLe: string | null; erreur: string | null } | null;
}) {
  const [etatNom, renommer, renommage] = useActionState<EtatSaisie, FormData>(
    actionRenommerEtablissement,
    {},
  );
  const [etatSup, supprimer, suppression] = useActionState<EtatSaisie, FormData>(
    actionSupprimerEtablissement,
    {},
  );
  const [confirmation, setConfirmation] = useState("");
  const vide = comptes === 0;

  return (
    <li className="ligne-etablissement">
      <div className="ligne-etablissement-tete">
        <b>{nom}</b>
        <span>
          {maitres} Cheikh{maitres > 1 ? "s" : ""} · {eleves} élève{eleves > 1 ? "s" : ""}
        </span>
      </div>
      {activite ? (
        <div className="ligne-etablissement-activite">
          <span className="jauge-activite" aria-hidden="true">
            <span
              style={{
                width: `${eleves ? Math.min(100, Math.round((activite.elevesActifs7j / eleves) * 100)) : 0}%`,
              }}
            />
          </span>
          <span>
            {activite.elevesActifs7j} actif{activite.elevesActifs7j > 1 ? "s" : ""} sur 7 j ·{" "}
            {activite.seances30j} séances en 30 j
          </span>
          {activite.semaines?.some((n) => n > 0) ? <MiniCourbe valeurs={activite.semaines} /> : null}
          {activite.eleves ? <span>régularité {activite.regularite ?? 0} %</span> : null}
          {activite.enBaisse ? (
            <span className="pastille-etat etat-a-ecouter">
              {activite.enBaisse} élève{activite.enBaisse > 1 ? "s" : ""} en baisse
            </span>
          ) : null}
          {activite.aVoir ? <span className="pastille-etat etat-valide">{activite.aVoir} à voir</span> : null}
          {activite.sansSaisie7j ? (
            <span className="pastille-etat etat-a-ecouter">{activite.sansSaisie7j} sans saisie</span>
          ) : null}
          {activite.sansLecture ? (
            <span className="pastille-etat etat-a-ecouter">{activite.sansLecture} lecture à choisir</span>
          ) : null}
        </div>
      ) : null}
      <div className="classes-etablissement">
        <span className="classes-etablissement-titre">
          {classes.length ? `Classes (${classes.length})` : "Aucune classe pour l’instant"}
        </span>
        {classes.length ? (
          <ul>
            {classes.map((c) => (
              <li key={c.id}>
                <Link href={`/presences/${c.id}`} className="classe-carte">
                  <b>{c.nom}</b>
                  <span>
                    {c.cheikhs.length ? c.cheikhs.map((m) => m.nom).join(", ") : "Sans Cheikh"} ·{" "}
                    {c.nbMembres} élève{c.nbMembres > 1 ? "s" : ""}
                    {c.jours.length ? ` · ${c.jours.map((j) => JOURS[j]).join(", ")}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={`/presences/nouvelle?etablissement=${id}`} className="lien-discret">
          + Nouvelle classe
        </Link>
      </div>
      <div className="ligne-etablissement-actions">
        <Link href={`/maitre?classe=${id}`} className="lien-discret">
          Voir les élèves
        </Link>
        <HorairesMawaqit id={id} mawaqit={mawaqit} />
        <PositionMosquee id={id} position={position} />
        <details>
          <summary className="lien-discret">Renommer</summary>
          <form action={renommer} className="formulaire-ligne">
            <input type="hidden" name="id" value={id} />
            <input name="nom" defaultValue={nom} maxLength={120} required aria-label="Nouveau nom" />
            <button type="submit" className="bouton bouton-auto" disabled={renommage}>
              Enregistrer
            </button>
            {etatNom.erreur ? <p className="message-erreur">{etatNom.erreur}</p> : null}
          </form>
        </details>
        <details>
          <summary className="lien-discret lien-danger">Supprimer</summary>
          {vide ? (
            <form action={supprimer} className="formulaire-ligne">
              <input type="hidden" name="id" value={id} />
              <label className="aide-confirmation">
                Tape <b>{nom}</b> pour confirmer la suppression définitive.
                <input
                  name="confirmation"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                type="submit"
                className="bouton-danger bouton-auto"
                disabled={suppression || !confirmationValide(nom, confirmation)}
              >
                Supprimer l’établissement
              </button>
              {etatSup.erreur ? <p className="message-erreur">{etatSup.erreur}</p> : null}
            </form>
          ) : (
            <p className="aide-confirmation">
              Il reste {comptes} compte{comptes > 1 ? "s" : ""} ici (archivés compris). Déplace-les vers un
              autre établissement (colonne « Établissement » de la liste des utilisateurs) ou supprime-les,
              puis reviens.
            </p>
          )}
        </details>
      </div>
    </li>
  );
}

/** Les séances des 8 dernières semaines, en petite courbe (la plus récente à droite). */
function MiniCourbe({ valeurs }: { valeurs: number[] }) {
  const L = 80;
  const H = 22;
  const max = Math.max(1, ...valeurs);
  const pas = L / Math.max(1, valeurs.length - 1);
  const points = valeurs.map((v, i) => `${(i * pas).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`);
  return (
    <svg
      className="mini-courbe"
      viewBox={`0 0 ${L} ${H}`}
      width={L}
      height={H}
      role="img"
      aria-label={`Séances des 8 dernières semaines : ${valeurs.join(", ")}`}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DATE_IMPORT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * Horaires de la mosquée depuis Mawaqit : on colle le lien de sa page, les heures des prières de
 * l'année sont importées tout de suite, puis mises à jour seules chaque mois (le ciel les suit).
 */
function HorairesMawaqit({
  id,
  mawaqit,
}: {
  id: string;
  mawaqit: { adresse: string; importeLe: string | null; erreur: string | null } | null;
}) {
  const [etat, relier, enCours] = useActionState<EtatSaisie, FormData>(actionRelierMawaqit, {});
  return (
    <details>
      <summary className="lien-discret">
        Horaires Mawaqit{" "}
        {mawaqit?.importeLe ? <Check size={14} className="icone-texte" aria-hidden="true" /> : null}
      </summary>
      <form action={relier} className="formulaire-ligne formulaire-mawaqit">
        <input type="hidden" name="id" value={id} />
        <input
          name="mawaqit"
          inputMode="url"
          defaultValue={mawaqit ? `https://mawaqit.net/fr/m/${mawaqit.adresse}` : ""}
          placeholder="https://mawaqit.net/fr/m/ma-mosquee"
          aria-label="Lien de la page de la mosquée sur Mawaqit"
          autoComplete="off"
        />
        <button type="submit" className="bouton bouton-auto" disabled={enCours}>
          {enCours ? "Import…" : "Enregistrer"}
        </button>
        {etat.erreur ? <p className="message-erreur">{etat.erreur}</p> : null}
        <p className="carte-graphique-sous">
          {mawaqit?.importeLe
            ? `Importés le ${DATE_IMPORT.format(new Date(mawaqit.importeLe))} · mis à jour chaque mois.`
            : mawaqit?.erreur
              ? `Dernier import en échec : ${mawaqit.erreur}`
              : "Colle le lien de la page de la mosquée sur mawaqit.net : le ciel suivra ses horaires."}{" "}
          Vide : retire la page (le ciel revient au calcul).
        </p>
      </form>
    </details>
  );
}

/**
 * Position de la mosquée : le ciel de la barre du haut suit les vraies heures de prière du lieu.
 * « Ma position » la remplit depuis le téléphone (à faire sur place) ; sinon, coordonnées d'une carte.
 */
function PositionMosquee({
  id,
  position,
}: {
  id: string;
  position: { latitude: number; longitude: number } | null;
}) {
  const [etat, placer, enCours] = useActionState<EtatSaisie, FormData>(actionPlacerEtablissement, {});
  const [lat, setLat] = useState(position ? String(position.latitude) : "");
  const [lon, setLon] = useState(position ? String(position.longitude) : "");
  const [geo, setGeo] = useState<string | null>(null);
  return (
    <details>
      <summary className="lien-discret">
        {position ? (
          <>
            Position <Check size={14} className="icone-texte" aria-hidden="true" />
          </>
        ) : (
          "Position (heures de prière)"
        )}
      </summary>
      <form action={placer} className="formulaire-ligne formulaire-position">
        <input type="hidden" name="id" value={id} />
        <input
          name="latitude"
          inputMode="decimal"
          placeholder="Latitude (48.60)"
          aria-label="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          name="longitude"
          inputMode="decimal"
          placeholder="Longitude (2.55)"
          aria-label="Longitude"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
        />
        <button
          type="button"
          className="bouton-secondaire bouton-auto"
          onClick={() => {
            if (!navigator.geolocation) return setGeo("Position indisponible sur cet appareil.");
            setGeo("Recherche de la position…");
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setLat(p.coords.latitude.toFixed(4));
                setLon(p.coords.longitude.toFixed(4));
                setGeo(null);
              },
              () => setGeo("Position refusée ou introuvable."),
              { enableHighAccuracy: false, timeout: 10000 },
            );
          }}
        >
          Ma position
        </button>
        <button type="submit" className="bouton bouton-auto" disabled={enCours}>
          Enregistrer
        </button>
        {geo ? <p className="carte-graphique-sous">{geo}</p> : null}
        {etat.erreur ? <p className="message-erreur">{etat.erreur}</p> : null}
        <p className="carte-graphique-sous">
          Vide : Paris par défaut. Les heures servent au ciel de la barre du haut (aube, jour, coucher, nuit).
        </p>
      </form>
    </details>
  );
}

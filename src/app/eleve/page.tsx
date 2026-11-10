import Link from "next/link";
import {
  cleMois,
  decalerMois,
  formaterDuree,
  libelleJourCourt,
  libelleMois,
  LIBELLE_TYPE,
  premierJour,
  TYPES_SEANCE,
  type JourFiche,
  type Objectif,
  type TypeSeance,
} from "@/domain/fiche";
import { creerReferentiel, libellePassage, type Referentiel } from "@/domain/versets";
import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";
import { chargerFiche } from "@/services/fiche";
import { actionEnregistrerObjectif } from "./actions";

const NOM_SEMAINE = ["", "Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4", "Semaine 5"];

export default async function PageFiche({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; type?: string }>;
}) {
  const profil = await exigerEspace("eleve");
  const params = await searchParams;
  const fiche = await chargerFiche(profil.id, params.mois, params.type);
  const ref = creerReferentiel(fiche.sourates);
  const cle = cleMois(fiche.mois);
  const lien = (mois: string, type: TypeSeance) => `/eleve?mois=${mois}&type=${type}`;

  return (
    <>
      <EnteteEspace titre="Ma fiche" nom={`${profil.prenom} ${profil.nom}`.trim()} role="Élève" />
      <main className="espace">
        <nav className="mois" aria-label="Changer de mois">
          <Link
            className="mois-fleche"
            href={lien(cleMois(decalerMois(fiche.mois, -1)), fiche.type)}
            aria-label="Mois précédent"
          >
            ‹
          </Link>
          <h1 className="mois-titre">{libelleMois(fiche.mois)}</h1>
          <Link
            className="mois-fleche"
            href={lien(cleMois(decalerMois(fiche.mois, 1)), fiche.type)}
            aria-label="Mois suivant"
          >
            ›
          </Link>
        </nav>

        <nav className="onglets" aria-label="Type de séance">
          {TYPES_SEANCE.map((t) => (
            <Link
              key={t}
              href={lien(cle, t)}
              className="onglet"
              aria-current={t === fiche.type ? "page" : undefined}
            >
              {LIBELLE_TYPE[t]}
            </Link>
          ))}
        </nav>

        <p className="resume-mois">
          <strong>{formaterDuree(fiche.totalMinutes)}</strong> ce mois-ci ·{" "}
          <strong>{fiche.joursTravailles}</strong> jour{fiche.joursTravailles > 1 ? "s" : ""} travaillé
          {fiche.joursTravailles > 1 ? "s" : ""}
        </p>

        <div className="semaines">
          {fiche.semaines.map((semaine) => (
            <section key={semaine.numero} className="semaine" aria-labelledby={`s${semaine.numero}`}>
              <header className="semaine-entete">
                <h2 id={`s${semaine.numero}`}>{NOM_SEMAINE[semaine.numero]}</h2>
                <span>
                  {libelleJourCourt(semaine.jours[0]!.date)} → {libelleJourCourt(semaine.jours.at(-1)!.date)}{" "}
                  · {formaterDuree(semaine.totalMinutes)}
                </span>
              </header>
              <ul className="jours">
                {semaine.jours.map((jour) => (
                  <li key={jour.date}>
                    <LigneJour jour={jour} type={fiche.type} ref_={ref} />
                  </li>
                ))}
              </ul>
              <FormulaireObjectif
                titre="Objectif de la semaine"
                objectif={semaine.objectif}
                type={fiche.type}
                mois={premierJour(fiche.mois)}
                semaine={String(semaine.numero)}
              />
            </section>
          ))}
        </div>

        <section className="semaine">
          <header className="semaine-entete">
            <h2>Objectif du mois</h2>
          </header>
          <FormulaireObjectif
            titre="Objectif du mois"
            objectif={fiche.objectifMensuel}
            type={fiche.type}
            mois={premierJour(fiche.mois)}
            semaine=""
          />
        </section>
      </main>
    </>
  );
}

function LigneJour({ jour, type, ref_ }: { jour: JourFiche; type: TypeSeance; ref_: Referentiel }) {
  const s = jour.seance;
  const contenu = s
    ? [...s.passages.map((p) => libellePassage(ref_, p)), ...(s.tajwid ? [`Tajwid : ${s.tajwid}`] : [])].join(
        " · ",
      ) || "Séance sans passage"
    : null;

  const corps = (
    <>
      <span className="jour-nom">
        Jour {jour.numero}
        <small>{libelleJourCourt(jour.date)}</small>
      </span>
      <span className="jour-duree">{s ? formaterDuree(s.dureeMin) : "—"}</span>
      <span className={s ? "jour-contenu" : "jour-contenu jour-vide"}>
        {contenu ?? (jour.futur ? "" : "+ Ajouter")}
        {s?.corrigee ? <span className="pastille-or">Corrigée par le maître</span> : null}
      </span>
    </>
  );

  const classes = ["jour", jour.aujourdhui ? "jour-aujourdhui" : "", jour.futur ? "jour-futur" : ""].join(
    " ",
  );
  if (jour.futur) return <div className={classes}>{corps}</div>;
  return (
    <Link className={classes} href={`/eleve/seance?date=${jour.date}&type=${type}`}>
      {corps}
    </Link>
  );
}

const STATUTS = [
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "atteint", libelle: "✓ Atteint" },
  { valeur: "non_atteint", libelle: "✗ Non atteint" },
] as const;

function FormulaireObjectif({
  titre,
  objectif,
  type,
  mois,
  semaine,
}: {
  titre: string;
  objectif: Objectif | null;
  type: TypeSeance;
  mois: string;
  semaine: string;
}) {
  const id = `objectif-${semaine || "mois"}`;
  return (
    <form action={actionEnregistrerObjectif} className="objectif">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mois" value={mois} />
      <input type="hidden" name="semaine" value={semaine} />
      <label htmlFor={id} className="objectif-titre">
        {titre}
      </label>
      <input
        id={id}
        name="description"
        defaultValue={objectif?.description ?? ""}
        placeholder="ex. Apprendre Al-Mulk, versets 1 à 15"
        maxLength={300}
        required
      />
      <fieldset className="objectif-statut">
        <legend className="visuellement-cache">Statut</legend>
        {STATUTS.map((s) => (
          <label key={s.valeur} className={`statut statut-${s.valeur}`}>
            <input
              type="radio"
              name="statut"
              value={s.valeur}
              defaultChecked={(objectif?.statut ?? "en_cours") === s.valeur}
            />
            {s.libelle}
          </label>
        ))}
      </fieldset>
      <button type="submit" className="bouton-secondaire">
        Enregistrer
      </button>
    </form>
  );
}

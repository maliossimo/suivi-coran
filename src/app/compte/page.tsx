import { Building2, CalendarHeart, UsersRound } from "lucide-react";
import { actionDeconnexion } from "@/app/actions/auth";
import Link from "next/link";
import { COMMIT, LIBELLE_VERSION } from "@/lib/version";
import { Avatar } from "@/components/Avatar";
import { EtiquetteLecture } from "@/components/ChoixLecture";
import { EnteteEspace } from "@/components/EnteteEspace";
import { SousTitreEntete } from "@/components/SousTitreEntete";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";
import { InstallerAppli } from "@/components/InstallerAppli";
import { ReglageApparence } from "@/components/ReglageApparence";
import { ReglageRetours } from "@/components/ReglageRetours";
import { chargerCompte } from "@/services/acces";
import { LIBELLE_ROLE_LONG } from "@/domain/roles";
import { libelleDateLongue } from "@/domain/fiche";

/** Jour (à Paris) d'un horodatage. */
function jourParis(horodatage: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(horodatage));
}

export default async function PageCompte() {
  const { profil, email, details } = await chargerCompte();
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <>
      <EnteteEspace titre="Mon compte" nom={nom} role={profil.role} />
      <main className="espace espace-etroit">
        <SousTitreEntete texte={`${nom || "Mon compte"} · ${LIBELLE_ROLE_LONG[profil.role]}`} />
        <section className="carte-compte profil-compte">
          <div className="profil-compte-tete">
            <Avatar
              prenom={profil.prenom}
              nom={profil.nom}
              email={email}
              cle={profil.id}
              role={profil.role}
              taille="grand"
            />
            <div className="profil-compte-identite">
              <h1>{nom || "Mon compte"}</h1>
              <p className="profil-compte-role">{LIBELLE_ROLE_LONG[profil.role]}</p>
              {email ? <p className="carte-compte-email">{email}</p> : null}
            </div>
          </div>
          {details.etablissement || details.classes.length || details.inscritLe ? (
            <ul className="profil-compte-details">
              {details.etablissement ? (
                <li>
                  <Building2 size={18} aria-hidden="true" />
                  <span>Mosquée</span>
                  <b>{details.etablissement}</b>
                </li>
              ) : null}
              {details.classes.map((c) => (
                <li key={c.classe}>
                  <UsersRound size={18} aria-hidden="true" />
                  <span>Classe</span>
                  <b>
                    {c.classe}
                    {c.cheikhs ? <small>Cheikh : {c.cheikhs}</small> : null}
                  </b>
                </li>
              ))}
              {details.inscritLe ? (
                <li>
                  <CalendarHeart size={18} aria-hidden="true" />
                  <span>Membre depuis</span>
                  <b>
                    <time dateTime={details.inscritLe}>
                      {libelleDateLongue(jourParis(details.inscritLe))}
                    </time>
                  </b>
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>

        <InstallerAppli />

        {profil.role === "eleve" ? (
          <section className="carte-compte-section">
            <h2>Ma lecture</h2>
            <p className="carte-compte-aide">
              Tu récites en <EtiquetteLecture lecture={profil.lecture} /> : la numérotation des versets suit
              cette lecture.
            </p>
            <Link href="/eleve/lecture" className="bouton-secondaire bouton-lien">
              {profil.lecture ? "Changer de lecture" : "Choisir ma lecture"}
            </Link>
          </section>
        ) : null}

        <section className="carte-compte-section">
          <h2>Apparence</h2>
          <ReglageApparence />
          <p className="carte-graphique-sous">Réglage propre à ce téléphone.</p>
        </section>

        <section className="carte-compte-section">
          <h2>Sons et vibrations</h2>
          <ReglageRetours />
          <p className="carte-graphique-sous">Réglage propre à ce téléphone.</p>
        </section>

        <section className="carte-compte-section">
          <h2>Mot de passe</h2>
          <p className="carte-compte-aide">10 caractères minimum.</p>
          <FormulaireMotDePasse />
        </section>

        <section className="carte-compte-section">
          <h2>Déconnexion</h2>
          <p className="carte-compte-aide">Pense à te déconnecter sur un appareil partagé.</p>
          <form action={actionDeconnexion}>
            <button className="bouton-secondaire bouton-deconnexion" type="submit">
              Se déconnecter
            </button>
          </form>
        </section>
        <p className="compte-version">
          Suivi cours Coran · {LIBELLE_VERSION}
          {COMMIT ? ` (${COMMIT})` : ""}
        </p>
      </main>
    </>
  );
}

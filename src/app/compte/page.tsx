import { actionDeconnexion } from "@/app/actions/auth";
import Link from "next/link";
import { COMMIT, LIBELLE_VERSION } from "@/lib/version";
import { Avatar } from "@/components/Avatar";
import { EtiquetteLecture } from "@/components/ChoixLecture";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";
import { InstallerAppli } from "@/components/InstallerAppli";
import { chargerCompte } from "@/services/acces";

const LIBELLE_ROLE = { eleve: "Élève", maitre: "Cheikh", admin: "Administrateur" } as const;

export default async function PageCompte() {
  const { profil, email } = await chargerCompte();
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <>
      <EnteteEspace titre="Mon compte" nom={nom} role={profil.role} />
      <main className="espace espace-etroit">
        <section className="carte-compte">
          <Avatar
            prenom={profil.prenom}
            nom={profil.nom}
            email={email}
            cle={profil.id}
            role={profil.role}
            taille="grand"
          />
          <div>
            <h1>{nom || "Mon compte"}</h1>
            <p>{LIBELLE_ROLE[profil.role]}</p>
            {email ? <p className="carte-compte-email">{email}</p> : null}
          </div>
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

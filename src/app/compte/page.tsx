import { actionDeconnexion } from "@/app/actions/auth";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";
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
          <span className="avatar avatar-clair avatar-grand" aria-hidden="true">
            {`${profil.prenom[0] ?? ""}${profil.nom[0] ?? ""}`.toUpperCase() || "?"}
          </span>
          <div>
            <h1>{nom || "Mon compte"}</h1>
            <p>{LIBELLE_ROLE[profil.role]}</p>
            {email ? <p className="carte-compte-email">{email}</p> : null}
          </div>
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
      </main>
    </>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { actionBasculer } from "@/app/actions/comptesLies";
import { EnteteEspace } from "@/components/EnteteEspace";
import { SousTitreEntete } from "@/components/SousTitreEntete";
import { accueilDuRole, LIBELLE_ROLE_LONG } from "@/domain/roles";
import { exigerConnexion } from "@/services/acces";
import { mesComptesLies } from "@/services/comptesLies";

/** Après la connexion, une personne qui a deux comptes liés choisit l'espace où entrer. */
export default async function PageChoisirEspace() {
  const profil = await exigerConnexion();
  const autres = await mesComptesLies(profil);
  if (autres.length === 0) redirect(accueilDuRole(profil.role));
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <>
      <EnteteEspace titre="Choisir l’espace" nom={nom} role={profil.role} />
      <main className="espace espace-etroit">
        <SousTitreEntete texte="Où veux-tu entrer ?" />
        <section className="carte-compte">
          <h1>Continuer comme</h1>
          <p className="carte-graphique-sous">
            {nom || "Mon compte"} · {LIBELLE_ROLE_LONG[profil.role]}
          </p>
          <Link className="bouton" href={accueilDuRole(profil.role)}>
            Entrer dans l’espace{" "}
            {profil.role === "admin" ? "administrateur" : profil.role === "maitre" ? "Cheikh" : "élève"}
          </Link>
        </section>
        {autres.map((c) => (
          <section key={c.id} className="carte-compte">
            <h2>{`${c.prenom} ${c.nom}`.trim() || "Autre compte"}</h2>
            <p className="carte-graphique-sous">{LIBELLE_ROLE_LONG[c.role]}</p>
            <form action={actionBasculer}>
              <input type="hidden" name="cible" value={c.id} />
              <button className="bouton bouton-secondaire" type="submit">
                Passer à l’espace{" "}
                {c.role === "admin" ? "administrateur" : c.role === "maitre" ? "Cheikh" : "élève"}
              </button>
            </form>
          </section>
        ))}
      </main>
    </>
  );
}

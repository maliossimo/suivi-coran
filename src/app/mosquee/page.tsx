import { CalendarCheck, ChevronRight, UserPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { FormulaireInvitation } from "@/components/FormulaireInvitation";
import { chargerMaMosquee, exigerResponsable } from "@/services/mosquee";

/** « Ma mosquée » : le Cheikh responsable gère sa mosquée (classes, Cheikhs, élèves). */
export default async function PageMaMosquee() {
  const profil = await exigerResponsable();
  const m = await chargerMaMosquee(profil);

  return (
    <>
      <EnteteEspace titre="Ma mosquée" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <header className="seance-entete">
          <h1>{m.nom}</h1>
          <p>
            {m.classes.length} classe{m.classes.length > 1 ? "s" : ""} · {m.cheikhs.length} Cheikh
            {m.cheikhs.length > 1 ? "s" : ""} · {m.eleves} élève{m.eleves > 1 ? "s" : ""}
          </p>
        </header>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Classes</h2>
            <Link href="/presences" className="lien-discret">
              Organiser <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {m.classes.length === 0 ? (
            <div className="vide-action">
              <p className="carte-graphique-sous">
                Pas encore de classe : crée la première, puis choisis son Cheikh.
              </p>
              <Link href="/presences/nouvelle" className="bouton bouton-lien">
                <CalendarCheck size={16} aria-hidden="true" /> Créer une classe
              </Link>
            </div>
          ) : (
            <ul className="liste-mosquee">
              {m.classes.map((c) => (
                <li key={c.id}>
                  <Link href={`/presences/${c.id}`}>
                    <b>{c.nom}</b>
                    <span>
                      {c.cheikhs.length ? c.cheikhs.join(", ") : "sans Cheikh"} · {c.eleves} élève
                      {c.eleves > 1 ? "s" : ""}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {m.sansClasse > 0 ? (
            <p className="carte-graphique-sous">
              {m.sansClasse} élève{m.sansClasse > 1 ? "s" : ""} dans aucune classe : ajoute-les depuis la page
              de la classe (« Ajouter des élèves »).
            </p>
          ) : null}
        </section>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Élèves</h2>
            <span className="admin-compte">{m.eleves}</span>
          </div>
          <div className="actions-mosquee">
            <Link href="/maitre" className="bouton-secondaire bouton-lien">
              <UsersRound size={16} aria-hidden="true" /> Voir les élèves
            </Link>
            <Link href="/maitre/inviter" className="bouton bouton-lien">
              <UserPlus size={16} aria-hidden="true" /> Inviter des élèves
            </Link>
          </div>
        </section>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Cheikhs</h2>
            <span className="admin-compte">{m.cheikhs.length}</span>
          </div>
          {m.cheikhs.length ? (
            <ul className="liste-mosquee liste-noms">
              {m.cheikhs.map((c) => (
                <li key={c.id}>{c.nom}</li>
              ))}
            </ul>
          ) : null}
          <details className="admin-repli">
            <summary>Inviter un Cheikh</summary>
            <FormulaireInvitation
              cible="maitre"
              etablissements={[{ id: m.id, nom: m.nom }]}
              classes={m.classes.map((c) => ({ id: c.id, nom: c.nom, etablissementId: m.id }))}
            />
          </details>
        </section>
      </main>
    </>
  );
}

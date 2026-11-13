import { CalendarCheck, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EnvoiAppels } from "@/components/presences/EnvoiAppels";
import { PreparerHorsLigne } from "@/components/fiche/PreparerHorsLigne";
import { libelleDateLongue, libelleJourSemaine } from "@/domain/fiche";
import { libelleJours, libelleResume } from "@/domain/presences";
import { chargerAccueilPresences, exigerPresences } from "@/services/presences";

export const metadata = { title: "Présences" };

export default async function PagePresences({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const profil = await exigerPresences();
  const responsable = (await searchParams).vue === "responsable";
  const p = await chargerAccueilPresences(profil);
  const modifiable = p.peutCreer && !responsable;
  const suffixe = responsable ? "?vue=responsable" : "";

  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <EnvoiAppels />
        {modifiable ? (
          <PreparerHorsLigne
            pages={p.classes.filter((c) => c.coursAujourdhui).map((c) => `/presences/${c.id}/appel`)}
          />
        ) : null}
        <div className="presences-entete">
          <p>
            Aujourd’hui · {libelleJourSemaine(p.aujourdhui)} {libelleDateLongue(p.aujourdhui)}
          </p>
          <Link href={responsable ? "/presences" : "/presences?vue=responsable"} className="lien-discret">
            <Eye size={14} aria-hidden="true" />{" "}
            {responsable ? "Revenir à ma vue" : "Voir comme le responsable"}
          </Link>
        </div>
        {responsable ? (
          <p className="bandeau-vue-admin" role="status">
            <Eye size={16} aria-hidden="true" />
            <span>
              Vue du responsable de la mosquée : présences et absences seulement, <b>lecture seule</b>
            </span>
          </p>
        ) : null}

        {p.classes.length === 0 ? (
          <section className="carte-graphique">
            <h2>Aucune classe</h2>
            <p className="carte-graphique-sous">
              Crée une classe (par exemple « Coran » le lundi, mardi et jeudi, « Fiqh » le samedi et
              dimanche), puis ajoute ses élèves.
            </p>
          </section>
        ) : (
          <ul className="liste-classes">
            {p.classes.map((c) => (
              <li key={c.id} className={c.coursAujourdhui ? "carte-classe aujourdhui" : "carte-classe"}>
                <Link href={`/presences/${c.id}${suffixe}`} className="carte-classe-lien">
                  <span className="carte-classe-titre">
                    <strong>{c.nom}</strong>
                    <small>
                      {c.nbMembres} élève{c.nbMembres > 1 ? "s" : ""}
                    </small>
                  </span>
                  <span className="carte-classe-sous">
                    {libelleJours(c.jours) || "Jours à définir"}
                    {c.etablissement ? ` · ${c.etablissement}` : ""}
                  </span>
                  <span className="carte-classe-sous">
                    {c.dernierAppel
                      ? `Dernier appel ${libelleJourSemaine(c.dernierAppel.date)} ${libelleDateLongue(c.dernierAppel.date)} : ${libelleResume(c.dernierAppel.resume)}`
                      : "Pas encore d’appel"}
                  </span>
                </Link>
                {modifiable && c.coursAujourdhui ? (
                  <Link
                    href={`/presences/${c.id}/appel`}
                    className={c.appelFait ? "bouton-secondaire" : "bouton"}
                  >
                    <CalendarCheck size={18} aria-hidden="true" />
                    {c.appelFait ? "Appel fait · modifier" : "Faire l’appel"}
                  </Link>
                ) : !c.coursAujourdhui && c.prochainCours ? (
                  <span className="carte-classe-prochain">
                    Prochain cours : {libelleJourSemaine(c.prochainCours)}{" "}
                    {libelleDateLongue(c.prochainCours)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {modifiable ? (
          <Link href="/presences/nouvelle" className="bouton-secondaire bouton-lien">
            <Plus size={16} aria-hidden="true" /> Nouvelle classe
          </Link>
        ) : null}
        {p.archivees.length && !responsable ? (
          <details className="legende-pastilles">
            <summary>Classes terminées ({p.archivees.length})</summary>
            <ul className="liste-simple">
              {p.archivees.map((c) => (
                <li key={c.id}>
                  <Link href={`/presences/${c.id}`}>{c.nom}</Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
    </>
  );
}

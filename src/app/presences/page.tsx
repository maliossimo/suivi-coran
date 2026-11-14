import { CalendarCheck, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { EtatVide } from "@/components/EtatVide";
import { ChoixVue } from "@/components/presences/ChoixVue";
import { EnvoiAppels } from "@/components/presences/EnvoiAppels";
import { PreparerHorsLigne } from "@/components/fiche/PreparerHorsLigne";
import { libelleDateLongue, libelleJourSemaine } from "@/domain/fiche";
import { avecVue, libelleJours, libelleResume } from "@/domain/presences";
import { chargerAccueilPresences, exigerPresences } from "@/services/presences";

export const metadata = { title: "Présences" };

export default async function PagePresences({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { profil, apercu, peut, vue } = await exigerPresences((await searchParams).vue);
  const p = await chargerAccueilPresences();

  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <EnvoiAppels />
        {peut.appel && !apercu ? (
          <PreparerHorsLigne
            pages={p.classes.filter((c) => c.coursAujourdhui).map((c) => `/presences/${c.id}/appel`)}
          />
        ) : null}
        <div className="presences-entete">
          <p>
            Aujourd’hui · {libelleJourSemaine(p.aujourdhui)} {libelleDateLongue(p.aujourdhui)}
          </p>
          {peut.rapport ? (
            <Link href={avecVue("/presences/rapport", apercu)} className="bouton-secondaire bouton-compact">
              <FileText size={16} aria-hidden="true" /> Rapport PDF
            </Link>
          ) : null}
        </div>
        {profil.role === "admin" ? <ChoixVue chemin="/presences" apercu={apercu} /> : null}

        {p.classes.length === 0 ? (
          <EtatVide titre="Aucune classe pour l’instant">
            <p>
              {peut.organiser
                ? "Crée une classe (par exemple « Coran » le lundi, mardi et jeudi, « Fiqh » le samedi et dimanche), choisis son Cheikh, puis ajoute ses élèves."
                : "Le responsable de la mosquée crée les classes et t’y désigne comme Cheikh."}
            </p>
            {peut.organiser ? (
              <Link href={avecVue("/presences/nouvelle", apercu)} className="bouton bouton-lien">
                <Plus size={16} aria-hidden="true" /> Créer la première classe
              </Link>
            ) : null}
          </EtatVide>
        ) : (
          <ul className="liste-classes">
            {p.classes.map((c) => (
              <li key={c.id} className={c.coursAujourdhui ? "carte-classe aujourdhui" : "carte-classe"}>
                <Link href={avecVue(`/presences/${c.id}`, apercu)} className="carte-classe-lien">
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
                {peut.appel && c.coursAujourdhui ? (
                  <Link
                    href={avecVue(`/presences/${c.id}/appel`, apercu)}
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

        {peut.organiser && p.classes.length > 0 ? (
          <Link href={avecVue("/presences/nouvelle", apercu)} className="bouton-secondaire bouton-lien">
            <Plus size={16} aria-hidden="true" /> Nouvelle classe
          </Link>
        ) : null}
        {p.archivees.length && vue !== "cheikh" ? (
          <details className="legende-pastilles">
            <summary>Classes terminées ({p.archivees.length})</summary>
            <ul className="liste-simple">
              {p.archivees.map((c) => (
                <li key={c.id}>
                  <Link href={avecVue(`/presences/${c.id}`, apercu)}>{c.nom}</Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
    </>
  );
}

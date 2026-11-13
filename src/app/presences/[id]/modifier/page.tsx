import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { actionChangerMembre } from "@/app/actions/presences";
import { EnteteEspace } from "@/components/EnteteEspace";
import { AjoutMembre } from "@/components/presences/AjoutMembre";
import { FormulaireClasse } from "@/components/presences/FormulaireClasse";
import { avecVue } from "@/domain/presences";
import { chargerFormulaireClasse, exigerPresences } from "@/services/presences";

export const metadata = { title: "Modifier la classe" };

export default async function PageModifierClasse({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vue?: string }>;
}) {
  const { profil, apercu, peut } = await exigerPresences((await searchParams).vue);
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (!peut.organiser && !peut.eleves) redirect(avecVue(`/presences/${id}`, apercu));
  const f = await chargerFormulaireClasse(id);
  if (!f.classe) notFound();
  const classe = f.classe;
  const dejaDansLaClasse = new Set(f.membres.filter((m) => m.actif && m.eleveId).map((m) => m.eleveId));
  const actifs = f.membres.filter((m) => m.actif);
  const partis = f.membres.filter((m) => !m.actif);

  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit">
        <Link href={avecVue(`/presences/${classe.id}`, apercu)} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          {classe.nom}
        </Link>

        <section className="carte-graphique">
          <h2>Élèves de la classe ({actifs.length})</h2>
          {actifs.length ? (
            <ul className="liste-simple liste-membres">
              {actifs.map((m) => (
                <li key={m.id}>
                  <span>
                    {m.prenom} {m.nom}
                    {!m.avecCompte ? <small> · sans compte</small> : null}
                  </span>
                  <form action={actionChangerMembre}>
                    <input type="hidden" name="membre" value={m.id} />
                    <input type="hidden" name="actif" value="false" />
                    <button type="submit" className="lien-discret bouton-lien">
                      Retirer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="carte-graphique-sous">Pas encore d’élève.</p>
          )}
          <AjoutMembre
            classeId={classe.id}
            eleves={f.personnes.eleves.filter((e) => !dejaDansLaClasse.has(e.id))}
          />
          {partis.length ? (
            <details>
              <summary className="lien-discret">Élèves retirés ({partis.length})</summary>
              <ul className="liste-simple liste-membres">
                {partis.map((m) => (
                  <li key={m.id}>
                    <span>
                      {m.prenom} {m.nom}
                    </span>
                    <form action={actionChangerMembre}>
                      <input type="hidden" name="membre" value={m.id} />
                      <input type="hidden" name="actif" value="true" />
                      <button type="submit" className="lien-discret bouton-lien">
                        Remettre
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className="carte-graphique-sous">Un élève retiré garde son historique de présences.</p>
        </section>

        {peut.organiser ? (
          <section className="carte-graphique">
            <h2>La classe</h2>
            <FormulaireClasse
              classe={{
                id: classe.id,
                nom: classe.nom,
                jours: classe.jours,
                archivee: classe.archivee,
                cheikhs: classe.cheikhs.map((c) => c.id),
              }}
              etablissements={f.etablissements}
              etablissementId={classe.etablissementId}
              maitres={f.personnes.maitres}
            />
          </section>
        ) : (
          <p className="carte-graphique-sous">
            Le nom de la classe, ses jours et son Cheikh sont fixés par le responsable de la mosquée.
          </p>
        )}
      </main>
    </>
  );
}

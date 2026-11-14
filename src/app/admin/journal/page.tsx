import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { EnteteEspace } from "@/components/EnteteEspace";
import { Selecteur } from "@/components/Selecteur";
import { depuisQuand, ELEMENTS, grouperParJour, phraseAudit } from "@/domain/journal";
import { exigerEspace } from "@/services/acces";
import { chargerJournal } from "@/services/admin";
import { chargerSignalementsTajwid } from "@/services/tajwid";
import { dateHeure, heure } from "@/domain/format";
import { LIBELLE_ROLE } from "@/domain/roles";

const ACTIONS: Record<string, string> = {
  INSERT: "Créations",
  UPDATE: "Modifications",
  DELETE: "Suppressions",
  SUPPRESSION_UTILISATEUR: "Comptes supprimés",
};

const MAJUSCULE = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);

/** « Inès Kaci » → prénom et nom pour l'avatar. */
function decouper(nom: string): { prenom: string; nom: string } {
  const [prenom = "", ...reste] = nom.split(" ");
  return { prenom, nom: reste.join(" ") };
}

export default async function PageJournal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profil = await exigerEspace("admin");
  const { evenements, noms, personnes, filtres, utilisation, ouvertures } = await chargerJournal(
    profil,
    await searchParams,
  );
  const signalements = await chargerSignalementsTajwid(profil);
  const filtre = Object.values(filtres).some(Boolean);
  const maintenant = new Date();
  const jours = grouperParJour(evenements, maintenant);
  const actifs7j = utilisation.filter((c) => c.ouvertures7j > 0).length;

  return (
    <>
      <EnteteEspace titre="Journal" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-admin">
        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Qui utilise l’appli</h2>
            <span className="admin-compte">{actifs7j} actifs sur 7 jours</span>
          </div>
          <ul className="liste-personnes">
            {utilisation.map((c) => (
              <li key={c.id}>
                <Avatar {...decouper(c.nom)} cle={c.id} role={c.role} taille="petit" />
                <span className="liste-personnes-nom">
                  <b>{c.nom}</b>
                  <small>{LIBELLE_ROLE[c.role]}</small>
                </span>
                <span className="liste-personnes-quand">
                  <span className={c.ouvertures7j ? "point-actif" : "point-inactif"} aria-hidden="true" />
                  {depuisQuand(c.derniereUtilisation, maintenant)}
                  {c.ouvertures7j ? <small>{c.ouvertures7j}× sur 7 j</small> : null}
                </span>
              </li>
            ))}
          </ul>
          <details className="admin-repli">
            <summary>
              {ouvertures.length ? `Dernières ouvertures (${ouvertures.length})` : "Aucune ouverture notée"}
            </summary>
            <ul className="fil-journal">
              {ouvertures.map((o) => (
                <li key={o.id}>
                  <time dateTime={o.quand}>{dateHeure(o.quand)}</time>
                  <span>
                    <b>{noms.get(o.personneId) ?? "Compte supprimé"}</b> a ouvert l’appli
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="carte-graphique">
          <div className="admin-titre">
            <h2>Journal des actions</h2>
            <span className="admin-compte">{evenements.length} dernières</span>
          </div>

          <details className="admin-repli filtres-journal" open={filtre}>
            <summary>{filtre ? "Filtres actifs" : "Filtrer"}</summary>
            <form className="filtres-admin" method="get">
              <Selecteur
                titre="Personne"
                name="personne"
                defaultValue={filtres.personne ?? ""}
                options={[
                  { valeur: "", libelle: "Tout le monde" },
                  ...personnes.map((p) => ({ valeur: p.id, libelle: p.nom })),
                ]}
                placeholderRecherche="Nom"
                soumettre
                compact
              />
              <Selecteur
                titre="Action"
                name="action"
                defaultValue={filtres.action ?? ""}
                options={[
                  { valeur: "", libelle: "Toutes les actions" },
                  ...Object.entries(ACTIONS).map(([v, l]) => ({ valeur: v, libelle: l })),
                ]}
                soumettre
                compact
              />
              <Selecteur
                titre="Élément"
                name="table"
                defaultValue={filtres.table ?? ""}
                options={[
                  { valeur: "", libelle: "Tous les éléments" },
                  ...Object.entries(ELEMENTS).map(([v, l]) => ({
                    valeur: v,
                    libelle: MAJUSCULE(l.replace(/^une? /, "")),
                  })),
                ]}
                soumettre
                compact
              />
              <label className="filtre-date">
                Du
                <input type="date" name="du" defaultValue={filtres.du ?? ""} />
              </label>
              <label className="filtre-date">
                au
                <input type="date" name="au" defaultValue={filtres.au ?? ""} />
              </label>
              <button type="submit" className="bouton bouton-auto">
                Filtrer
              </button>
              {filtre ? (
                <Link href="/admin/journal" className="lien-discret">
                  Tout afficher
                </Link>
              ) : null}
            </form>
          </details>

          {jours.length === 0 ? (
            <p className="carte-graphique-sous">Aucune action{filtre ? " pour ces filtres" : ""}.</p>
          ) : (
            jours.map((j) => (
              <div key={j.cle} className="jour-journal">
                <h3>{MAJUSCULE(j.titre)}</h3>
                <ul className="fil-journal">
                  {j.evenements.map((e) => (
                    <li key={e.id} className={`action-${e.action.toLowerCase()}`}>
                      <time dateTime={e.quand}>{heure(e.quand)}</time>
                      <span>
                        <b>{e.acteurId ? (noms.get(e.acteurId) ?? "Inconnu") : "Système"}</b>{" "}
                        {phraseAudit(e.action, e.table)}
                        {e.eleveId && e.eleveId !== e.acteurId ? (
                          <small> · {noms.get(e.eleveId) ?? "élève supprimé"}</small>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="admin-note">Rempli par la base elle-même, ce journal ne peut pas être modifié.</p>
        </section>
        {signalements ? (
          <section className="carte-graphique">
            <div className="admin-titre">
              <h2>Vérification tajwid : « L’appli s’est trompée »</h2>
              <span className="admin-compte">{signalements.total}</span>
            </div>
            {signalements.total === 0 ? (
              <p className="carte-graphique-sous">Aucun signalement pour l’instant.</p>
            ) : (
              <>
                <p className="carte-graphique-sous">Les règles les plus signalées, à régler en priorité.</p>
                <ul className="tajwid-regles">
                  {signalements.parRegle.map((r) => (
                    <li key={r.regle}>
                      <span>{r.nom}</span>
                      <b>{r.nombre}</b>
                    </li>
                  ))}
                </ul>
                <details className="admin-repli">
                  <summary>Derniers signalements</summary>
                  <ul className="fil-journal">
                    {signalements.derniers.map((s, i) => (
                      <li key={i}>
                        <time dateTime={s.quand}>{dateHeure(s.quand)}</time>
                        <span>
                          <b>{s.auteur}</b> · {s.sourate}:{s.verset}{" "}
                          <span lang="ar" dir="rtl">
                            {s.mot}
                          </span>
                          {s.remarque ? <small> · {s.remarque}</small> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}

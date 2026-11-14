import { AlertTriangle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { BoutonPartager } from "@/components/presences/BoutonPartager";
import { ChoixVue } from "@/components/presences/ChoixVue";
import { Selecteur } from "@/components/Selecteur";
import { lireDate } from "@/domain/calendrier";
import { libelleDateLongue } from "@/domain/fiche";
import {
  JOURS,
  LETTRE_STATUT,
  LIBELLE_STATUT,
  avecVue,
  jourIso,
  libelleJours,
  periodeEgale,
  periodesRapides,
  type Periode,
} from "@/domain/presences";
import { chargerRapport, exigerPresences, type ClasseRapport } from "@/services/presences";

export const metadata = { title: "Rapport des présences" };

/** Au-delà, le détail jour par jour ne tient plus sur une page : on garde les totaux. */
const MAX_COLONNES_JOURS = 16;

function libellePeriode({ du, au }: Periode): string {
  if (du === au) return `le ${libelleDateLongue(du)}`;
  const a = lireDate(du);
  const b = lireDate(au);
  const debut =
    a.annee === b.annee && a.mois === b.mois
      ? String(a.jour === 1 ? "1er" : a.jour)
      : a.annee === b.annee
        ? libelleDateLongue(du).replace(/ \d{4}$/, "")
        : libelleDateLongue(du);
  return `du ${debut} au ${libelleDateLongue(au)}`;
}

function texteAPartager(classes: ClasseRapport[], periode: Periode): string {
  const lignes = [`Présences ${libellePeriode(periode)}`];
  for (const c of classes) {
    lignes.push("", `${c.classe.nom}${c.taux === null ? "" : ` · ${c.taux} % de présence`}`);
    for (const l of c.lignes) {
      lignes.push(
        `${l.membre.prenom} ${l.membre.nom} : ${l.absences} absence${l.absences > 1 ? "s" : ""}${l.taux === null ? "" : ` (${l.taux} %)`}`,
      );
    }
  }
  return lignes.join("\n");
}

export default async function PageRapport({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; classe?: string; vue?: string }>;
}) {
  const q = await searchParams;
  const { profil, apercu, peut } = await exigerPresences(q.vue);
  if (!peut.rapport) redirect(avecVue("/presences", apercu));
  const r = await chargerRapport(q);
  const lien = (p: Periode) =>
    avecVue(
      `/presences/rapport?du=${p.du}&au=${p.au}${r.classeChoisie ? `&classe=${r.classeChoisie}` : ""}`,
      apercu,
    );
  const titre = r.classeChoisie
    ? (r.toutes.find((c) => c.id === r.classeChoisie)?.nom ?? "Classe")
    : "Toutes les classes";

  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace rapport-presences">
        {profil.role === "admin" ? (
          <ChoixVue
            chemin={`/presences/rapport?du=${r.periode.du}&au=${r.periode.au}${r.classeChoisie ? `&classe=${r.classeChoisie}` : ""}`}
            apercu={apercu}
          />
        ) : null}
        <Link href={avecVue("/presences", apercu)} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Présences
        </Link>

        <section className="carte-graphique rapport-reglages">
          <h1 className="titre-carte">Rapport des présences</h1>
          <nav className="puces-periode" aria-label="Période">
            {periodesRapides(r.aujourdhui).map((p) => (
              <Link
                key={p.cle}
                href={lien(p.periode)}
                className={periodeEgale(p.periode, r.periode) ? "puce-periode actif" : "puce-periode"}
                aria-current={periodeEgale(p.periode, r.periode) ? "true" : undefined}
                replace
                scroll={false}
              >
                {p.libelle}
              </Link>
            ))}
          </nav>
          <form method="get" className="formulaire-rapport">
            <label>
              <span>Du</span>
              <input type="date" name="du" defaultValue={r.periode.du} required />
            </label>
            <label>
              <span>Au</span>
              <input type="date" name="au" defaultValue={r.periode.au} required />
            </label>
            <div className="formulaire-rapport-classe">
              <span>Classe</span>
              <Selecteur
                titre="Classe"
                name="classe"
                defaultValue={r.classeChoisie ?? ""}
                options={[
                  { valeur: "", libelle: "Toutes les classes" },
                  ...r.toutes.map((c) => ({ valeur: c.id, libelle: c.nom })),
                ]}
              />
            </div>
            {apercu ? <input type="hidden" name="vue" value={apercu} /> : null}
            <button type="submit" className="bouton-secondaire">
              Afficher
            </button>
          </form>
          <BoutonPartager titre={`Présences · ${titre}`} texte={texteAPartager(r.classes, r.periode)} />
        </section>

        <header className="rapport-titre">
          <h2>Présences · {titre}</h2>
          <p>{libellePeriode(r.periode)}</p>
        </header>

        {r.classes.length === 0 ? (
          <p className="carte-graphique-sous">
            Aucune classe pour l’instant : crée-en une depuis <Link href="/presences">Présences</Link>.
          </p>
        ) : null}
        {r.classes.map((c) => (
          <TableauClasse key={c.classe.id} c={c} />
        ))}
        <p className="legende-statuts">
          P présent · A absent · « · » pas d’appel ce jour-là · % : part des cours où l’élève était présent
        </p>
      </main>
    </>
  );
}

function TableauClasse({ c }: { c: ClasseRapport }) {
  const detail = c.dates.length > 0 && c.dates.length <= MAX_COLONNES_JOURS;
  const sansAppel = c.dates.filter((d) => !c.appelsFaits.has(d)).length;
  return (
    <section className="carte-graphique rapport-classe">
      <div className="rapport-classe-entete">
        <h3>{c.classe.nom}</h3>
        <strong>{c.taux === null ? "—" : `${c.taux} %`}</strong>
      </div>
      <p className="carte-graphique-sous">
        {libelleJours(c.classe.jours) || "Jours à définir"}
        {c.classe.cheikhs.length ? ` · ${c.classe.cheikhs.map((x) => x.nom).join(", ")}` : ""} ·{" "}
        {c.appelsFaits.size} appel{c.appelsFaits.size > 1 ? "s" : ""} sur {c.dates.length} cours
      </p>
      {sansAppel ? (
        <p className="rapport-alerte">
          <AlertTriangle size={14} aria-hidden="true" /> {sansAppel} cours sans appel sur la période.
        </p>
      ) : null}
      {c.lignes.length === 0 ? (
        <p className="carte-graphique-sous">Aucun élève dans cette classe.</p>
      ) : (
        <div className="tableau-defilant">
          <table className="tableau tableau-presences">
            <thead>
              <tr>
                <th>Élève</th>
                {detail
                  ? c.dates.map((d) => (
                      <th key={d} className={c.appelsFaits.has(d) ? undefined : "sans-appel"}>
                        <small>{JOURS[jourIso(d) - 1]?.court.slice(0, 2)}</small>
                        <span>{lireDate(d).jour}</span>
                      </th>
                    ))
                  : null}
                <th title="Présences">P</th>
                <th title="Absences">A</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {c.lignes.map((l) => (
                <tr key={l.membre.id} className={l.membre.actif ? undefined : "membre-parti"}>
                  <td>
                    {l.membre.prenom} {l.membre.nom}
                  </td>
                  {detail
                    ? l.statuts.map((s, i) => (
                        <td
                          key={i}
                          className={s ? `case-statut statut-${s}` : "case-statut"}
                          title={s ? LIBELLE_STATUT[s] : "Pas d’appel"}
                        >
                          {s ? LETTRE_STATUT[s] : "·"}
                        </td>
                      ))
                    : null}
                  <td className="case-total">{l.presences}</td>
                  <td className={l.absences ? "case-total case-statut statut-absent" : "case-total"}>
                    {l.absences}
                  </td>
                  <td className="case-taux">{l.taux === null ? "—" : l.taux}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

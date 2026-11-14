import { AlertTriangle, CalendarCheck, ChevronLeft, ChevronRight, Settings, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { BoutonPartager } from "@/components/presences/BoutonPartager";
import { ChoixVue } from "@/components/presences/ChoixVue";
import { EnvoiAppels } from "@/components/presences/EnvoiAppels";
import { lireDate } from "@/domain/calendrier";
import { decalerMois, libelleMois } from "@/domain/fiche";
import {
  JOURS,
  LETTRE_STATUT,
  LIBELLE_STATUT,
  SEUIL_ABSENCES,
  avecVue,
  jourIso,
  libelleJours,
} from "@/domain/presences";
import { chargerClasseMois, exigerPresences } from "@/services/presences";

export const metadata = { title: "Présences de la classe" };

export default async function PageClasse({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mois?: string; vue?: string }>;
}) {
  const q = await searchParams;
  const { profil, apercu, peut } = await exigerPresences(q.vue);
  const c = await chargerClasseMois((await params).id, q.mois);
  if (!c) notFound();
  const [annee, mois] = c.mois.split("-").map(Number) as [number, number];
  const lien = (delta: number) => {
    const m = decalerMois({ annee, mois }, delta);
    return avecVue(`/presences/${c.classe.id}?mois=${m.annee}-${String(m.mois).padStart(2, "0")}`, apercu);
  };
  const reglages = peut.organiser || peut.eleves;
  const titreMois = libelleMois({ annee, mois });
  const texte = [
    `Présences · ${c.classe.nom} · ${titreMois}`,
    c.taux !== null ? `Présence moyenne : ${c.taux} %` : "",
    "",
    ...c.lignes.map((l) => {
      const absences = l.statuts.filter((s) => s === "absent").length;
      return `${l.membre.prenom} ${l.membre.nom} : ${l.taux ?? "—"} %${absences ? ` (${absences} absence${absences > 1 ? "s" : ""})` : ""}`;
    }),
  ]
    .filter((x, i) => x || i === 2)
    .join("\n");

  return (
    <>
      <EnteteEspace titre="Présences" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace">
        <EnvoiAppels />
        {profil.role === "admin" ? (
          <ChoixVue chemin={`/presences/${c.classe.id}?mois=${c.mois}`} apercu={apercu} />
        ) : null}
        <Link href={avecVue("/presences", apercu)} className="lien-retour">
          <ChevronLeft size={18} aria-hidden="true" />
          Présences
        </Link>
        <header className="carte-eleve entete-classe">
          <div className="carte-eleve-identite">
            <h1>{c.classe.nom}</h1>
            <p className="carte-graphique-sous">
              {libelleJours(c.classe.jours) || "Jours à définir"}
              {c.classe.cheikhs.length ? ` · ${c.classe.cheikhs.map((x) => x.nom).join(", ")}` : ""}
              {c.classe.archivee ? " · terminée" : ""}
            </p>
          </div>
          {reglages ? (
            <Link
              href={avecVue(`/presences/${c.classe.id}/modifier`, apercu)}
              className="mois-fleche"
              aria-label={peut.organiser ? "Modifier la classe" : "Élèves de la classe"}
            >
              {peut.organiser ? (
                <Settings size={20} aria-hidden="true" />
              ) : (
                <UserPlus size={20} aria-hidden="true" />
              )}
            </Link>
          ) : null}
          {peut.appel && !c.classe.archivee ? (
            <Link
              href={avecVue(`/presences/${c.classe.id}/appel`, apercu)}
              className="carte-eleve-progression"
            >
              <CalendarCheck size={18} aria-hidden="true" />
              <span>Faire l’appel</span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : null}
        </header>

        <nav className="mois" aria-label="Changer de mois">
          <Link className="mois-fleche" href={lien(-1)} aria-label="Mois précédent" scroll={false}>
            <ChevronLeft size={22} aria-hidden="true" />
          </Link>
          <h2 className="mois-titre">{titreMois}</h2>
          <Link className="mois-fleche" href={lien(1)} aria-label="Mois suivant" scroll={false}>
            <ChevronRight size={22} aria-hidden="true" />
          </Link>
        </nav>

        <div className="tuiles">
          <div className="tuile tuile-or">
            <strong>{c.taux === null ? "—" : `${c.taux} %`}</strong>
            <span>de présence ce mois-ci</span>
          </div>
          <div className="tuile">
            <strong>{c.appelsFaits.size}</strong>
            <span>
              appel{c.appelsFaits.size > 1 ? "s" : ""} sur {c.dates.length} cours
            </span>
          </div>
        </div>

        {c.aSurveiller.length ? (
          <section className="bandeau-archive a-surveiller">
            <p>
              <AlertTriangle size={16} aria-hidden="true" /> <strong>À surveiller :</strong>{" "}
              {c.aSurveiller
                .map((l) => `${l.membre.prenom} ${l.membre.nom} (${l.absencesDAffilee} absences de suite)`)
                .join(", ")}
            </p>
          </section>
        ) : null}

        <section className="carte-graphique">
          <div className="entete-tableau-presences">
            <h2>Tableau du mois</h2>
            <BoutonPartager titre={`Présences ${c.classe.nom}`} texte={texte} />
          </div>
          {c.lignes.length === 0 ? (
            <p className="carte-graphique-sous">Aucun élève dans cette classe.</p>
          ) : c.dates.length === 0 ? (
            <p className="carte-graphique-sous">Pas encore de cours ce mois-ci.</p>
          ) : (
            <div className="tableau-defilant">
              <table className="tableau tableau-presences">
                <thead>
                  <tr>
                    <th>Élève</th>
                    {c.dates.map((d) => (
                      <th key={d} className={c.appelsFaits.has(d) ? undefined : "sans-appel"}>
                        <small>{JOURS[jourIso(d) - 1]?.court.slice(0, 2)}</small>
                        {peut.appel ? (
                          <Link href={avecVue(`/presences/${c.classe.id}/appel?date=${d}`, apercu)}>
                            {lireDate(d).jour}
                          </Link>
                        ) : (
                          <span>{lireDate(d).jour}</span>
                        )}
                      </th>
                    ))}
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {c.lignes.map((l) => (
                    <tr key={l.membre.id} className={l.membre.actif ? undefined : "membre-parti"}>
                      <td>
                        {l.membre.prenom} {l.membre.nom}
                        {l.absencesDAffilee >= SEUIL_ABSENCES ? (
                          <AlertTriangle size={13} aria-label="À surveiller" />
                        ) : null}
                      </td>
                      {l.statuts.map((s, i) => (
                        <td
                          key={i}
                          className={s ? `case-statut statut-${s}` : "case-statut"}
                          title={s ? LIBELLE_STATUT[s] : "Pas d’appel"}
                        >
                          {s ? LETTRE_STATUT[s] : "·"}
                        </td>
                      ))}
                      <td className="case-taux">{l.taux === null ? "—" : `${l.taux}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="legende-statuts">P présent · A absent · « · » pas d’appel ce jour-là</p>
        </section>
      </main>
    </>
  );
}

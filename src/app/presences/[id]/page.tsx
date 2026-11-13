import { AlertTriangle, CalendarCheck, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnteteEspace } from "@/components/EnteteEspace";
import { BoutonPartager } from "@/components/presences/BoutonPartager";
import { EnvoiAppels } from "@/components/presences/EnvoiAppels";
import { lireDate } from "@/domain/calendrier";
import { decalerMois, libelleMois } from "@/domain/fiche";
import { JOURS, LETTRE_STATUT, LIBELLE_STATUT, jourIso, libelleJours } from "@/domain/presences";
import { chargerClasseMois, exigerPresences } from "@/services/presences";

export const metadata = { title: "Présences de la classe" };

/** « Inès M. » : la première colonne du tableau reste étroite sur téléphone. */
function nomCourt(m: { prenom: string; nom: string }): string {
  return `${m.prenom}${m.nom ? ` ${m.nom.charAt(0)}.` : ""}`;
}

export default async function PageClasse({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mois?: string; vue?: string }>;
}) {
  const profil = await exigerPresences();
  const q = await searchParams;
  const c = await chargerClasseMois(profil, (await params).id, q.mois);
  if (!c) notFound();
  const responsable = q.vue === "responsable";
  const modifiable = c.peutAppel && !responsable;
  const [annee, mois] = c.mois.split("-").map(Number) as [number, number];
  const lien = (delta: number) => {
    const m = decalerMois({ annee, mois }, delta);
    return `/presences/${c.classe.id}?mois=${m.annee}-${String(m.mois).padStart(2, "0")}${responsable ? "&vue=responsable" : ""}`;
  };
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
        <Link href={`/presences${responsable ? "?vue=responsable" : ""}`} className="lien-retour">
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
          {modifiable ? (
            <Link
              href={`/presences/${c.classe.id}/modifier`}
              className="mois-fleche"
              aria-label="Modifier la classe"
            >
              <Settings size={20} aria-hidden="true" />
            </Link>
          ) : null}
          {modifiable ? (
            <Link href={`/presences/${c.classe.id}/appel`} className="carte-eleve-progression">
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
                        {modifiable ? (
                          <Link href={`/presences/${c.classe.id}/appel?date=${d}`}>{lireDate(d).jour}</Link>
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
                        {l.absencesDAffilee >= 2 ? (
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
          <p className="legende-statuts">
            P présent · A absent · R en retard · E excusé · « · » pas d’appel ce jour-là
          </p>
        </section>
      </main>
    </>
  );
}

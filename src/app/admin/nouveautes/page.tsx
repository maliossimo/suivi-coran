import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EnteteEspace } from "@/components/EnteteEspace";
import { lireChangelog } from "@/domain/nouveautes";
import { exigerEspace } from "@/services/acces";

function dateLisible(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** Ce qui a changé dans l'appli, version par version (lu dans CHANGELOG.md). */
export default async function PageNouveautes() {
  const profil = await exigerEspace("admin");
  let versions: ReturnType<typeof lireChangelog> = [];
  try {
    versions = lireChangelog(readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8"), 12);
  } catch {
    versions = [];
  }
  return (
    <>
      <EnteteEspace titre="Nouveautés" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-admin">
        {versions.length === 0 ? (
          <p className="carte-graphique-sous">Historique indisponible pour l’instant.</p>
        ) : (
          versions.map((v) => (
            <section key={v.numero} className="carte-graphique nouveautes-version">
              <div className="admin-titre">
                <h2>Version {v.numero}</h2>
                <span className="admin-compte">{dateLisible(v.date)}</span>
              </div>
              {v.rubriques.map((r) => (
                <div key={r.titre} className="nouveautes-rubrique">
                  <h3>{r.titre}</h3>
                  <ul>
                    {r.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}
      </main>
    </>
  );
}

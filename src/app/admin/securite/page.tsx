import { actionRetirerAppareil } from "@/app/actions/securite";
import { EnteteEspace } from "@/components/EnteteEspace";
import { exigerEspace } from "@/services/acces";
import { chargerSecurite } from "@/services/securite";
import { AjoutAppareil } from "./AjoutAppareil";

export const metadata = { title: "Double vérification" };

function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export default async function PageSecurite() {
  const profil = await exigerEspace("admin");
  const { appareils } = await chargerSecurite(profil);

  return (
    <>
      <EnteteEspace
        titre="Double vérification"
        nom={`${profil.prenom} ${profil.nom}`.trim()}
        role={profil.role}
      />
      <main className="espace espace-etroit">
        {appareils.length === 0 ? (
          <div className="bandeau-archive" role="status">
            <p>
              <strong>Pas encore active.</strong> Une fois un appareil ajouté, un code à 6 chiffres sera
              demandé à chaque connexion admin, en plus du mot de passe.
            </p>
          </div>
        ) : (
          <p className="message-info">
            Active : le code de ton appli est demandé à chaque connexion. Garde au moins deux appareils pour
            ne jamais être bloqué si tu perds ton téléphone.
          </p>
        )}

        <section className="carte-graphique">
          <h2>Appareils enregistrés</h2>
          {appareils.length === 0 ? (
            <p className="carte-graphique-sous">Aucun appareil.</p>
          ) : (
            <ul className="liste-simple">
              {appareils.map((a) => (
                <li key={a.id} className="ligne-appareil">
                  <span>
                    <strong>{a.nom.split(" · ")[0]}</strong>
                    <small> · ajouté le {dateCourte(a.creeLe)}</small>
                  </span>
                  {appareils.length > 1 ? (
                    <form action={actionRetirerAppareil}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="bouton-secondaire">
                        Retirer
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="carte-graphique">
          <h2>{appareils.length === 0 ? "Ajouter un appareil" : "Ajouter un autre appareil"}</h2>
          <AjoutAppareil premier={appareils.length === 0} />
        </section>
      </main>
    </>
  );
}

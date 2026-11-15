import { BookOpen, Mic } from "lucide-react";
import Link from "next/link";
import { EnteteEspace } from "@/components/EnteteEspace";
import { LIBELLE_LECTURE } from "@/domain/lectures";
import { exigerEleveAvecLecture } from "@/services/acces";
import { chargerAccueilCoran } from "@/services/accueilCoran";

export const metadata = { title: "Coran" };

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default async function PageCoranEleve() {
  const profil = await exigerEleveAvecLecture();
  const { lecture, passage } = await chargerAccueilCoran(profil);
  const lire = `/eleve/coran/lire?lecture=${lecture}`;
  const reciter = passage
    ? `${lire}&sourate=${passage.sourate}&du=${passage.du}&au=${passage.au}&reciter=1`
    : null;
  const dernier = passage?.scores.at(-1);

  return (
    <>
      <EnteteEspace titre="Coran" nom={`${profil.prenom} ${profil.nom}`.trim()} role={profil.role} />
      <main className="espace espace-etroit accueil-coran">
        <section className="carte-coran carte-reciter" aria-labelledby="titre-reciter">
          <h2 id="titre-reciter">
            <Mic size={20} aria-hidden="true" /> Réciter
          </h2>
          <p className="carte-coran-texte">
            Récite à voix haute : l’appli t’écoute et te montre les mots à revoir.
          </p>
          {passage && reciter ? (
            <>
              <p className="carte-coran-passage">
                <span className="carte-coran-quand">
                  {passage.type === "apprentissage" ? "Ton apprentissage" : "Ta révision"} du{" "}
                  {JOUR.format(new Date(`${passage.date}T12:00:00Z`))}
                </span>
                <strong>{passage.libelle}</strong>
              </p>
              {passage.scores.length ? (
                <p className="carte-coran-scores">
                  Derniers essais :{" "}
                  {passage.scores.map((s, i) => (
                    <span key={i} className="score-pastille">
                      {s}
                    </span>
                  ))}
                  {dernier !== undefined && dernier >= 90 ? " · Bravo, continue !" : null}
                </p>
              ) : (
                <p className="carte-coran-scores">Pas encore d’essai sur ce passage.</p>
              )}
              {passage.difficiles.length ? (
                <div className="carte-coran-difficiles">
                  <span>Tes mots à revoir :</span>
                  <ul>
                    {passage.difficiles.map((m) => (
                      <li key={`${m.verset}-${m.mot}`} lang="ar" dir="rtl">
                        {m.mot}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link href={reciter} className="bouton carte-coran-action">
                <Mic size={18} aria-hidden="true" /> Réciter ce passage
              </Link>
            </>
          ) : (
            <>
              <p className="carte-coran-scores">
                Quand ton Cheikh aura noté un passage sur ta fiche, il apparaîtra ici.
              </p>
              <Link href={lire} className="bouton-secondaire carte-coran-action">
                Choisir un passage dans le Coran
              </Link>
            </>
          )}
          <p className="carte-coran-note">
            Ta voix n’est jamais enregistrée : seuls ton score et tes mots à revoir sont gardés.
          </p>
        </section>

        <section className="carte-coran" aria-labelledby="titre-lire">
          <h2 id="titre-lire">
            <BookOpen size={20} aria-hidden="true" /> Lire et écouter
          </h2>
          <p className="carte-coran-texte">
            Le Coran en {LIBELLE_LECTURE[lecture]}, avec le récitateur de ton choix, la répétition d’un
            passage et l’écoute hors connexion.
          </p>
          <Link href={lire} className="bouton-secondaire carte-coran-action">
            <BookOpen size={18} aria-hidden="true" /> Ouvrir le Coran
          </Link>
        </section>
      </main>
    </>
  );
}

import { actionChoisirLecture } from "@/app/actions/lecture";
import { LECTURES, LIBELLE_LECTURE, NOM_ARABE_LECTURE, type Lecture } from "@/domain/lectures";

/**
 * Choix de la lecture (Hafs ou Warsh) : à la première connexion de l'élève,
 * pour corriger une erreur, ou par le Cheikh pour son élève.
 */
export function ChoixLecture({
  eleveId,
  actuelle,
  retour,
  premiereFois,
  pourUnEleve,
}: {
  eleveId: string;
  /** null : pas encore choisie. */
  actuelle: Lecture | null;
  retour: string;
  premiereFois: boolean;
  /** Le Cheikh (ou l'admin) choisit pour un élève. */
  pourUnEleve?: string;
}) {
  return (
    <form action={actionChoisirLecture} className="choix-lecture">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <fieldset>
        <legend>
          {pourUnEleve
            ? `${pourUnEleve} récite en Hafs ou en Warsh ?`
            : premiereFois
              ? "Tu récites en Hafs ou en Warsh ?"
              : "Ta lecture"}
        </legend>
        <p className="choix-lecture-aide">
          Prends celle {pourUnEleve ? "de son" : "de ton"} mushaf : la numérotation des versets et le
          découpage en hizb en dépendent.
        </p>
        <div className="choix-lecture-options">
          {LECTURES.map((l) => (
            <label key={l} className="carte-lecture">
              <input
                type="radio"
                name="lecture"
                value={l}
                defaultChecked={(actuelle ?? "hafs") === l}
                required
              />
              <span className="carte-lecture-nom">
                {LIBELLE_LECTURE[l]}
                <span className="arabe" lang="ar">
                  {NOM_ARABE_LECTURE[l]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {!premiereFois ? (
        <p className="choix-lecture-note">
          Les séances déjà saisies passent dans la numérotation de la nouvelle lecture (le même passage du
          Coran, avec ses numéros de versets). Ce que le Cheikh a vu reste vu.
        </p>
      ) : null}
      <button type="submit" className="bouton">
        {premiereFois ? "Continuer" : "Enregistrer"}
      </button>
    </form>
  );
}

/** Petite étiquette « Hafs » / « Warsh » (« Lecture à choisir » si l'élève ne l'a pas encore fait). */
export function EtiquetteLecture({ lecture }: { lecture: Lecture | null }) {
  return (
    <span className={lecture ? `etiquette-lecture etiquette-${lecture}` : "etiquette-lecture etiquette-vide"}>
      {lecture ? LIBELLE_LECTURE[lecture] : "Lecture à choisir"}
    </span>
  );
}

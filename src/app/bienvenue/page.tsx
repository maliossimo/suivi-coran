import Link from "next/link";
import type { CSSProperties } from "react";
import { CadreAuth } from "@/components/CadreAuth";
import { InstallerAppli } from "@/components/InstallerAppli";
import { accueilDuRole, type Role } from "@/domain/roles";
import { exigerConnexion } from "@/services/acces";

/** Les premiers pas, selon le rôle. */
const ETAPES: Record<Role, { titre: string; detail: string }[]> = {
  eleve: [
    {
      titre: "Choisis ta lecture",
      detail: "Hafs ou Warsh : les versets seront numérotés comme dans ton mushaf.",
    },
    {
      titre: "Note tes séances",
      detail: "Chaque jour, ce que tu as appris ou révisé, en quelques touchers.",
    },
    { titre: "Ton Cheikh te suit", detail: "Il écoute, valide et te laisse ses conseils sur ta fiche." },
  ],
  maitre: [
    {
      titre: "Invite tes élèves",
      detail: "Montre le QR code de ta classe : ils créent leur compte en un instant.",
    },
    { titre: "Suis leurs fiches", detail: "Les séances à écouter apparaissent en premier dans ta classe." },
    { titre: "Écoute et valide", detail: "Un toucher pour valider, un mot pour encourager." },
  ],
  admin: [],
};

/**
 * Juste après l'inscription (QR code ou invitation) : on propose d'installer l'appli
 * sur le téléphone. Le bouton pour continuer sur le site est toujours là.
 */
export default async function PageBienvenue() {
  const profil = await exigerConnexion();
  return (
    <CadreAuth
      titre={`Bienvenue${profil.prenom ? ` ${profil.prenom}` : ""} !`}
      sousTitre="Ton compte est prêt."
      fete
    >
      <div className="bienvenue">
        {ETAPES[profil.role].length ? (
          <ol className="bienvenue-etapes" aria-label="Tes premiers pas">
            {ETAPES[profil.role].map((e, i) => (
              <li key={e.titre} style={{ "--i": i } as CSSProperties}>
                <span className="bienvenue-numero" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <b>{e.titre}</b>
                  <small>{e.detail}</small>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <InstallerAppli titre="Installe l’appli (conseillé)" />
        <Link href={accueilDuRole(profil.role)} className="bouton bouton-secondaire bienvenue-continuer">
          Continuer sur le site
        </Link>
      </div>
    </CadreAuth>
  );
}

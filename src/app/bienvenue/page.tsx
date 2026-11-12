import Link from "next/link";
import { CadreAuth } from "@/components/CadreAuth";
import { InstallerAppli } from "@/components/InstallerAppli";
import { accueilDuRole } from "@/domain/roles";
import { exigerConnexion } from "@/services/acces";

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
    >
      <div className="bienvenue">
        <InstallerAppli titre="Installe l’appli (conseillé)" />
        <Link href={accueilDuRole(profil.role)} className="bouton bouton-secondaire bienvenue-continuer">
          Continuer sur le site
        </Link>
      </div>
    </CadreAuth>
  );
}

import Link from "next/link";
import { CadreAuth } from "@/components/CadreAuth";
import { FormulaireRejoindre } from "@/components/FormulaireRejoindre";
import { profilOptionnel } from "@/services/acces";
import { lireInvitation } from "@/services/rejoindre";

export const metadata = { title: "Rejoindre la classe — Suivi cours Coran" };

export default async function PageRejoindre({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [invitation, profil] = await Promise.all([lireInvitation(code), profilOptionnel()]);

  if (profil) {
    return (
      <CadreAuth titre="Tu es déjà connecté" sousTitre="Ce QR code sert à créer un nouveau compte élève.">
        <Link href="/" className="bouton bouton-auto">
          Aller à mon espace
        </Link>
      </CadreAuth>
    );
  }

  if (invitation.etat !== "valide") {
    return (
      <CadreAuth
        titre="QR code plus valable"
        sousTitre={
          invitation.etat === "inconnue"
            ? "Ce lien n’existe pas. Vérifie que tu as bien scanné le code de ton Cheikh."
            : "Ce code a expiré ou a été désactivé. Demande à ton Cheikh d’en afficher un nouveau."
        }
      >
        <Link href="/connexion" className="lien-retour">
          J’ai déjà un compte
        </Link>
      </CadreAuth>
    );
  }

  return (
    <CadreAuth
      titre="Rejoindre la classe"
      sousTitre={`${invitation.etablissementNom} — crée ton compte pour noter tes séances d’apprentissage et de révision.`}
    >
      <FormulaireRejoindre code={code} />
      <p className="auth-bas">
        Déjà un compte ? <Link href="/connexion">Se connecter</Link>
      </p>
    </CadreAuth>
  );
}

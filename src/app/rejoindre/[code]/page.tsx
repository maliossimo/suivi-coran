import Link from "next/link";
import { CadreAuth } from "@/components/CadreAuth";
import { FormulaireRejoindre } from "@/components/FormulaireRejoindre";
import { profilOptionnel } from "@/services/acces";
import { lireInvitation } from "@/services/rejoindre";
import { actionDeconnexionPourRejoindre } from "@/app/actions/auth";

export const metadata = { title: "Rejoindre la classe — Suivi cours Coran" };

export default async function PageRejoindre({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [invitation, profil] = await Promise.all([lireInvitation(code), profilOptionnel()]);

  // Téléphone déjà connecté (le Cheikh qui teste son lien, un parent…) : on propose de créer
  // le compte élève quand même, au lieu de laisser croire que le lien ne marche pas.
  if (profil && invitation.etat === "valide") {
    return (
      <CadreAuth
        titre="Rejoindre la classe"
        sousTitre={`Ce téléphone est connecté au compte de ${profil.prenom || "quelqu’un"}. Pour créer un compte élève dans ${invitation.etablissementNom}, déconnecte-toi d’abord.`}
      >
        <form action={actionDeconnexionPourRejoindre}>
          <input type="hidden" name="code" value={code} />
          <button type="submit" className="bouton bouton-auto">
            Me déconnecter et créer un compte élève
          </button>
        </form>
        <p className="auth-bas">
          <Link href="/">Non, aller à mon espace</Link>
        </p>
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

import { EnteteApp } from "@/components/EnteteApp";
import { FormulaireConnexion } from "./FormulaireConnexion";

const MESSAGES: Record<string, string> = {
  inactif: "Ce compte est désactivé. Contacte ton maître.",
  lien: "Ce lien n'est plus valide. Demande une nouvelle invitation ou un nouveau lien.",
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <main className="page-centree">
      <EnteteApp sousTitre="Apprentissage · Révision" />
      <FormulaireConnexion erreurInitiale={erreur ? MESSAGES[erreur] : undefined} />
      <p className="encart">
        Accès sur invitation uniquement. Tu n&apos;as pas reçu d&apos;e-mail ? Demande à ton maître de
        t&apos;inviter.
      </p>
    </main>
  );
}

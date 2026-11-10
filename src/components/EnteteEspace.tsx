import { actionDeconnexion } from "@/app/actions/auth";

export function EnteteEspace({ titre, nom }: { titre: string; nom: string }) {
  return (
    <header className="espace-entete">
      <div>
        <h1>{titre}</h1>
        <span style={{ color: "var(--texte-doux)", fontSize: 14 }}>{nom}</span>
      </div>
      <form action={actionDeconnexion}>
        <button className="bouton-secondaire" type="submit">
          Se déconnecter
        </button>
      </form>
    </header>
  );
}

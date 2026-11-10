import { redirect } from "next/navigation";
import { destinationApresConnexion } from "@/services/acces";

/** La racine renvoie chacun vers son espace (élève, maître, admin). */
export default async function Accueil() {
  redirect(await destinationApresConnexion());
}

/** Partagé entre le serveur (qui programme le bandeau) et le navigateur (qui l'affiche). */
export const NOM_COOKIE_NOTIFICATION = "notification";

export interface Notification {
  message: string;
  genre: "succes" | "erreur";
  id: number;
}

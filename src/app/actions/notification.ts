import "server-only";
import { cookies } from "next/headers";
import { NOM_COOKIE_NOTIFICATION, type Notification } from "@/components/notification-commun";

/**
 * Programme le bandeau de confirmation affiché après une action.
 * Passe par un cookie de courte durée pour survivre aux redirections ;
 * le bandeau le lit puis l'efface aussitôt.
 */
export async function notifier(message: string, genre: Notification["genre"] = "succes"): Promise<void> {
  const valeur: Notification = { message, genre, id: Date.now() };
  (await cookies()).set(NOM_COOKIE_NOTIFICATION, encodeURIComponent(JSON.stringify(valeur)), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // lu par le bandeau côté navigateur ; ne contient qu'un message
  });
}

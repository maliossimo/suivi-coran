import "server-only";
import { headers } from "next/headers";
import { envPublic } from "@/lib/env";

/** Adresse du site telle que la personne l'a ouverte (repli : le réglage du site). */
export async function origineDuSite(): Promise<string> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  if (hote && /^[a-z0-9.-]+(:\d+)?$/i.test(hote)) {
    const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
    return `${protocole === "http" ? "http" : "https"}://${hote}`;
  }
  return envPublic.NEXT_PUBLIC_SITE_URL;
}

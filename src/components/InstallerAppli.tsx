"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

/** Événement Chrome/Android qui permet de proposer l'installation en un appui. */
export interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Appareil = "installee" | "deja-installee" | "android" | "iphone" | "iphone-autre-navigateur" | "autre";

declare global {
  interface Window {
    /** Invitation de Chrome gardée par le script du layout (elle peut arriver avant cette section). */
    __invitationInstallation?: EvenementInstallation;
  }
  interface Navigator {
    getInstalledRelatedApps?: () => Promise<{ platform: string; url?: string }[]>;
  }
}

function detecterAppareil(): Appareil {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "installee";
  const ua = nav.userAgent;
  const iphone = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && nav.maxTouchPoints > 1);
  if (iphone) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "iphone-autre-navigateur" : "iphone";
  if (/Android/.test(ua)) return "android";
  return "autre";
}

/**
 * « Installer l'appli » : ajoute le site à l'écran d'accueil du téléphone.
 * Android : bouton en un appui (si Chrome le permet), sinon les étapes.
 * iPhone : les 2 étapes dans Safari.
 */
export function InstallerAppli() {
  const [appareil, setAppareil] = useState<Appareil | null>(null);
  const [invite, setInvite] = useState<EvenementInstallation | null>(null);

  useEffect(() => {
    setAppareil(detecterAppareil());
    // L'invitation de Chrome est peut-être déjà arrivée.
    if (window.__invitationInstallation) setInvite(window.__invitationInstallation);
    // Déjà installée sur ce téléphone (on est dans le navigateur, pas dans l'appli) ?
    navigator
      .getInstalledRelatedApps?.()
      .then((apps) => {
        if (apps.length > 0) setAppareil((a) => (a === "installee" ? a : "deja-installee"));
      })
      .catch(() => undefined);
    const surInvite = () => setInvite(window.__invitationInstallation ?? null);
    const surInstallee = () => {
      window.__invitationInstallation = undefined;
      setInvite(null);
      setAppareil("installee");
    };
    window.addEventListener("installation-disponible", surInvite);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("installation-disponible", surInvite);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  if (appareil === null) return null;

  return (
    <section className="carte-compte-section">
      <h2>Appli sur ton téléphone</h2>
      {appareil === "installee" ? (
        <p className="carte-compte-aide">C’est fait : tu utilises l’appli installée sur ton téléphone.</p>
      ) : appareil === "deja-installee" ? (
        <p className="carte-compte-aide">
          L’appli est déjà installée sur ce téléphone : ouvre-la depuis ton écran d’accueil (icône ق verte).
        </p>
      ) : (
        <>
          <p className="carte-compte-aide">
            Ajoute le site sur ton écran d’accueil : il s’ouvrira en plein écran, comme une appli. Rien à
            télécharger sur le Play Store ou l’App Store.
          </p>
          {invite ? (
            <button
              type="button"
              className="bouton bouton-installer"
              onClick={async () => {
                await invite.prompt();
                const choix = await invite.userChoice;
                window.__invitationInstallation = undefined;
                setInvite(null);
                if (choix.outcome === "accepted") setAppareil("installee");
              }}
            >
              <Download size={18} aria-hidden="true" />
              Installer l’appli
            </button>
          ) : appareil === "iphone" || appareil === "iphone-autre-navigateur" ? (
            <ol className="etapes-installation">
              <li>
                <Share size={18} aria-hidden="true" />
                <span>
                  Touche le bouton <b>Partager</b>{" "}
                  {appareil === "iphone"
                    ? "en bas de Safari."
                    : "(dans Chrome, il est en haut à droite, dans la barre d’adresse)."}
                </span>
              </li>
              <li>
                <SquarePlus size={18} aria-hidden="true" />
                <span>
                  Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="etapes-installation">
              <li>
                <span className="etape-menu" aria-hidden="true">
                  ⋮
                </span>
                <span>
                  Ouvre le menu du navigateur : <b>⋮</b> dans Chrome (en haut à droite), <b>≡</b> dans Samsung
                  Internet (en bas).
                </span>
              </li>
              <li>
                <SquarePlus size={18} aria-hidden="true" />
                <span>
                  Choisis <b>Ajouter à l’écran d’accueil</b>, <b>Installer l’application</b> ou{" "}
                  <b>Ajouter la page à → Écran d’accueil</b>.
                </span>
              </li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}

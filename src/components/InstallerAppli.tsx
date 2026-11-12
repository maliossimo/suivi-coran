"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

/** Événement Chrome/Android qui permet de proposer l'installation en un appui. */
export interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Appareil =
  "installee" | "deja-installee" | "android" | "iphone" | "iphone-autre-navigateur" | "ordinateur";

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
  return "ordinateur";
}

/**
 * « Installer l'appli » (téléphones uniquement, rien sur ordinateur).
 * Android : un bouton ; s'il ne peut pas installer directement, il affiche les 2 étapes.
 * iPhone : Apple n'autorise pas de bouton, on affiche les 2 étapes.
 * Le site reste toujours utilisable sans rien installer.
 */
export function InstallerAppli({ titre = "Appli sur ton téléphone" }: { titre?: string }) {
  const [appareil, setAppareil] = useState<Appareil | null>(null);
  const [invite, setInvite] = useState<EvenementInstallation | null>(null);
  const [etapesVisibles, setEtapesVisibles] = useState(false);

  useEffect(() => {
    setAppareil(detecterAppareil());
    if (window.__invitationInstallation) setInvite(window.__invitationInstallation);
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

  // Rien sur ordinateur (ni pendant la détection).
  if (appareil === null || appareil === "ordinateur") return null;

  async function installer() {
    const evt = invite ?? window.__invitationInstallation;
    if (!evt) {
      setEtapesVisibles(true); // le navigateur ne permet pas l'installation directe : on montre comment faire
      return;
    }
    await evt.prompt();
    const choix = await evt.userChoice;
    window.__invitationInstallation = undefined;
    setInvite(null);
    if (choix.outcome === "accepted") setAppareil("installee");
  }

  const iphone = appareil === "iphone" || appareil === "iphone-autre-navigateur";

  return (
    <section className="carte-compte-section">
      <h2>{titre}</h2>
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

          {!iphone ? (
            <button type="button" className="bouton bouton-installer" onClick={installer}>
              <Download size={18} aria-hidden="true" />
              Installer l’appli
            </button>
          ) : null}

          {etapesVisibles && !iphone ? (
            <p className="carte-compte-aide">
              Chrome ne propose pas l’installation directe en ce moment (c’est le cas pendant quelques
              semaines si elle a été refusée une fois, ou si l’appli est déjà installée). Fais-le en 2 étapes
              :
            </p>
          ) : null}
          {iphone || etapesVisibles ? (
            <ol className="etapes-installation">
              {iphone ? (
                <li>
                  <Share size={18} aria-hidden="true" />
                  <span>
                    Touche le bouton <b>Partager</b>{" "}
                    {appareil === "iphone"
                      ? "en bas de Safari."
                      : "(dans Chrome, il est en haut à droite, dans la barre d’adresse)."}
                  </span>
                </li>
              ) : (
                <li>
                  <span className="etape-menu" aria-hidden="true">
                    ⋮
                  </span>
                  <span>
                    Ouvre le menu du navigateur : <b>⋮</b> dans Chrome (en haut à droite), <b>≡</b> dans
                    Samsung Internet (en bas).
                  </span>
                </li>
              )}
              <li>
                <SquarePlus size={18} aria-hidden="true" />
                <span>
                  {iphone ? (
                    <>
                      Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.
                    </>
                  ) : (
                    <>
                      Choisis <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.
                    </>
                  )}
                </span>
              </li>
            </ol>
          ) : null}

          <p className="carte-compte-aide installer-sans">
            Ça ne marche pas ? Pas de souci : le site fonctionne aussi normalement dans ton navigateur.
          </p>
        </>
      )}
    </section>
  );
}

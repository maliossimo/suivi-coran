"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

/** Événement Chrome/Android qui permet de proposer l'installation en un appui. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Appareil = "installee" | "android" | "iphone" | "iphone-autre-navigateur" | "autre";

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
    const surInvite = (e: Event) => {
      e.preventDefault();
      setInvite(e as EvenementInstallation);
    };
    const surInstallee = () => setAppareil("installee");
    window.addEventListener("beforeinstallprompt", surInvite);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  if (appareil === null) return null;

  return (
    <section className="carte-compte-section">
      <h2>Appli sur ton téléphone</h2>
      {appareil === "installee" ? (
        <p className="carte-compte-aide">C’est fait : le site est installé sur ton écran d’accueil.</p>
      ) : (
        <>
          <p className="carte-compte-aide">
            Ajoute le site sur ton écran d’accueil : il s’ouvrira en plein écran, comme une appli. Rien à
            télécharger sur le Play Store ou l’App Store.
          </p>
          {invite ? (
            <button
              type="button"
              className="bouton"
              onClick={async () => {
                await invite.prompt();
                const choix = await invite.userChoice;
                setInvite(null);
                if (choix.outcome === "accepted") setAppareil("installee");
              }}
            >
              <Download size={18} aria-hidden="true" />
              Installer l’appli
            </button>
          ) : appareil === "iphone" ? (
            <ol className="etapes-installation">
              <li>
                <Share size={18} aria-hidden="true" />
                <span>
                  Touche le bouton <b>Partager</b> en bas de Safari.
                </span>
              </li>
              <li>
                <SquarePlus size={18} aria-hidden="true" />
                <span>
                  Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.
                </span>
              </li>
            </ol>
          ) : appareil === "iphone-autre-navigateur" ? (
            <p className="carte-compte-aide">
              Sur iPhone, ouvre ce site dans <b>Safari</b> pour pouvoir l’ajouter à l’écran d’accueil.
            </p>
          ) : (
            <ol className="etapes-installation">
              <li>
                <span className="etape-menu" aria-hidden="true">
                  ⋮
                </span>
                <span>
                  Ouvre le menu <b>⋮</b> de Chrome (en haut à droite).
                </span>
              </li>
              <li>
                <SquarePlus size={18} aria-hidden="true" />
                <span>
                  Choisis <b>Ajouter à l’écran d’accueil</b> ou <b>Installer l’application</b>.
                </span>
              </li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type VerrouEcran = { release: () => Promise<void> };

/**
 * Le QR code de la classe, et un bouton pour l'afficher en grand (à projeter ou à montrer en classe) :
 * plein écran sur fond blanc, avec le nom de la classe ; l'écran reste allumé tant qu'il est ouvert.
 */
export function QrPleinEcran({
  lien,
  classe,
  children,
}: {
  lien: string;
  classe: string;
  children: ReactNode;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    let verrou: VerrouEcran | null = null;
    let fini = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<VerrouEcran> } };
    nav.wakeLock
      ?.request("screen")
      .then((v) => {
        verrou = v;
        if (fini) v.release().catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      fini = true;
      verrou?.release().catch(() => undefined);
    };
  }, [ouvert]);

  const ouvrir = () => {
    dialogue.current?.showModal();
    setOuvert(true);
  };
  const fermer = () => dialogue.current?.close();

  return (
    <>
      <div className="qr-zone" data-lien={lien}>
        {children}
        <button type="button" className="bouton-secondaire qr-agrandir" onClick={ouvrir}>
          <Maximize2 size={18} aria-hidden="true" /> Afficher en grand
        </button>
      </div>
      <dialog
        ref={dialogue}
        className="qr-plein-ecran"
        aria-label={`QR code de la classe ${classe}`}
        onClose={() => setOuvert(false)}
        onClick={(e) => {
          // Toucher le fond ferme.
          if (e.target === e.currentTarget) fermer();
        }}
      >
        <div className="qr-plein-ecran-contenu">
          <p className="qr-plein-ecran-titre">Scanne pour rejoindre la classe</p>
          <p className="qr-plein-ecran-classe">{classe}</p>
          <div className="qr-plein-ecran-code">{children}</div>
          <p className="qr-plein-ecran-aide">Ouvre l’appareil photo de ton téléphone et vise le code.</p>
          <button type="button" className="bouton-secondaire" onClick={fermer}>
            <X size={18} aria-hidden="true" /> Fermer
          </button>
        </div>
      </dialog>
    </>
  );
}

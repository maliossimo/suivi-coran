"use client";

import { Check, Copy, ImageDown, Share2 } from "lucide-react";
import { useState } from "react";

/**
 * Partager l'inscription à la classe : le lien (le même que le QR code) dans un message tout prêt,
 * l'image du QR code avec le nom de la classe, ou le lien copié. Le lien est écrit dans le message
 * lui-même : certaines applis (WhatsApp sur iPhone) ignorent un lien envoyé à part.
 */
export function PartagerInvitation({ lien, classe }: { lien: string; classe?: string }) {
  const [etat, setEtat] = useState<"repos" | "copie" | "image">("repos");
  const message = `Rejoins ${classe ? `la classe « ${classe} »` : "ma classe"} sur Suivi cours Coran : crée ton compte avec ce lien ${lien}`;

  const signaler = (e: "copie" | "image") => {
    setEtat(e);
    window.setTimeout(() => setEtat("repos"), 2200);
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      signaler("copie");
    } catch {
      window.prompt("Copie ce lien :", lien);
    }
  };

  const partagerLien = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Rejoindre la classe", text: message });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // partage annulé
    }
    await copier();
  };

  const partagerImage = async () => {
    try {
      const fichier = await imageDuQr(classe);
      if (!fichier) return;
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: "Rejoindre la classe", text: message });
        return;
      }
      // Pas de partage de fichier (ordinateur) : l'image est téléchargée.
      const url = URL.createObjectURL(fichier);
      const a = document.createElement("a");
      a.href = url;
      a.download = fichier.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      signaler("image");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  };

  return (
    <div className="partage-invitation">
      <button type="button" className="bouton partage-principal" onClick={() => void partagerLien()}>
        <Share2 size={18} aria-hidden="true" /> Partager le lien d’inscription
      </button>
      <div className="partage-secondaires">
        <button type="button" className="bouton-secondaire" onClick={() => void partagerImage()}>
          {etat === "image" ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <ImageDown size={18} aria-hidden="true" />
          )}
          {etat === "image" ? "Image enregistrée" : "Partager l’image du QR"}
        </button>
        <button type="button" className="bouton-secondaire" onClick={() => void copier()}>
          {etat === "copie" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {etat === "copie" ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
      <p className="partage-lien" title={lien}>
        {lien}
      </p>
    </div>
  );
}

/** Le QR code affiché sur la page, en image PNG avec le titre et le nom de la classe. */
async function imageDuQr(classe?: string): Promise<File | null> {
  const svg = document.querySelector(".qr-zone .qr-code svg");
  if (!svg) return null;
  const source = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  await image.decode();
  const L = 900;
  const H = 1100;
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, L, H);
  ctx.fillStyle = "#123c2e";
  ctx.textAlign = "center";
  ctx.font = "700 52px Georgia, serif";
  ctx.fillText("Scanne pour rejoindre la classe", L / 2, 110);
  if (classe) {
    ctx.fillStyle = "#7a4f0e";
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.fillText(classe, L / 2, 175, L - 80);
  }
  ctx.drawImage(image, 100, 220, 700, 700);
  ctx.fillStyle = "#4b5a53";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText("Suivi cours Coran", L / 2, 1010);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  return blob ? new File([blob], "qr-classe.png", { type: "image/png" }) : null;
}

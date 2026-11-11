import QRCode from "qrcode";

/** QR code en SVG, calculé côté serveur (aucun script envoyé au téléphone). */
export async function QrCode({ texte, libelle }: { texte: string; libelle: string }) {
  const svg = await QRCode.toString(texte, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#123c2e", light: "#ffffff" },
  });
  return (
    <div className="qr-code" role="img" aria-label={libelle} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

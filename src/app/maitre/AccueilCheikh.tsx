import { QrCode as IconeQr } from "lucide-react";
import Link from "next/link";
import { actionGenererQr } from "@/app/actions/classe";
import { PartagerInvitation } from "@/components/PartagerInvitation";
import { QrCode } from "@/components/QrCode";
import { QrPleinEcran } from "@/components/QrPleinEcran";
import type { Profil } from "@/repositories/profils";
import { chargerQrClasse, classesDuCheikh } from "@/services/classe";
import { origineDuSite } from "./origine";

/**
 * Classe encore vide : trois étapes pour accueillir les premiers élèves, avec le QR code et le lien
 * directement ici (plus besoin d'aller dans « Inviter »).
 */
export async function AccueilCheikh({ profil }: { profil: Profil }) {
  const [cours] = await classesDuCheikh(profil, { touteLaMosquee: true });
  const qr = await chargerQrClasse(profil, undefined, cours?.id).catch(() => null);
  const lien = qr ? `${await origineDuSite()}/rejoindre/${qr.code}` : null;
  const nomClasse = cours?.nom ?? "Ma classe";
  return (
    <section className="accueil-cheikh" aria-labelledby="accueil-cheikh-titre">
      <h2 id="accueil-cheikh-titre">Accueille tes premiers élèves</h2>
      <ol className="accueil-etapes">
        <li>
          <strong>Montre le QR code</strong> en classe, ou envoie le lien (WhatsApp, SMS…).
        </li>
        <li>
          <strong>Chaque élève crée son compte</strong> et arrive directement dans ta classe.
        </li>
        <li>
          <strong>Il note ses séances</strong> : tu les retrouves ici, prêtes à écouter.
        </li>
      </ol>
      {qr && lien ? (
        <div className="accueil-qr">
          <QrPleinEcran lien={lien} classe={nomClasse}>
            <QrCode texte={lien} libelle="QR code pour rejoindre la classe" />
          </QrPleinEcran>
          <PartagerInvitation lien={lien} classe={cours?.nom} />
        </div>
      ) : (
        <form action={actionGenererQr}>
          {cours ? <input type="hidden" name="classe" value={cours.id} /> : null}
          <button type="submit" className="bouton">
            <IconeQr size={18} aria-hidden="true" /> Afficher le QR code de la classe
          </button>
        </form>
      )}
      <Link href="/maitre/inviter" className="lien-discret">
        Plus d’options d’invitation
      </Link>
    </section>
  );
}

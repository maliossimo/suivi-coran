"use client";

import { useActionState } from "react";
import { actionConfirmerAppareil, actionPreparerAppareil, type EtatAjout } from "@/app/actions/securite";

export function AjoutAppareil({ premier }: { premier: boolean }) {
  const [prep, preparer, enPrep] = useActionState<EtatAjout, FormData>(actionPreparerAppareil, {});
  const [conf, confirmer, enConf] = useActionState<EtatAjout, FormData>(actionConfirmerAppareil, {});
  const appareil = prep.appareil;

  if (!appareil) {
    return (
      <form action={preparer} className="formulaire" noValidate>
        {prep.erreur ? (
          <p className="message-erreur" role="alert">
            {prep.erreur}
          </p>
        ) : null}
        <p className="carte-graphique-sous">
          Installe une appli d’authentification (Google Authenticator, Microsoft Authenticator, 2FAS…) sur ton
          téléphone{premier ? ", puis sur un deuxième appareil par sécurité" : ""}.
        </p>
        <div className="champ">
          <label htmlFor="nom">Nom de l’appareil</label>
          <input
            id="nom"
            name="nom"
            maxLength={40}
            placeholder="Mon téléphone"
            defaultValue={premier ? "Mon téléphone" : ""}
          />
        </div>
        <button className="bouton" type="submit" disabled={enPrep}>
          {enPrep ? "Préparation…" : "Continuer"}
        </button>
      </form>
    );
  }

  return (
    <form action={confirmer} className="formulaire" noValidate>
      {conf.erreur ? (
        <p className="message-erreur" role="alert">
          {conf.erreur}
        </p>
      ) : null}
      <p className="carte-graphique-sous">1. Dans l’appli, ajoute un compte et scanne ce QR code.</p>
      {/* QR code fourni par Supabase sous forme d'image SVG (data:) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="qr-verification"
        src={appareil.qr}
        alt="QR code à scanner avec l’appli d’authentification"
        width={200}
        height={200}
      />
      <details>
        <summary className="lien-discret">Impossible de scanner ? Saisis la clé à la main</summary>
        <code className="cle-verification">{appareil.cle.match(/.{1,4}/g)?.join(" ")}</code>
      </details>
      <input type="hidden" name="id" value={appareil.id} />
      <div className="champ">
        <label htmlFor="code-ajout">2. Saisis le code à 6 chiffres affiché</label>
        <input
          id="code-ajout"
          name="code"
          className="champ-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123 456"
          required
        />
      </div>
      <button className="bouton" type="submit" disabled={enConf}>
        {enConf ? "Vérification…" : "Activer cet appareil"}
      </button>
    </form>
  );
}

import { dateHegirienne, libelleHegirien, libelleHegirienArabe } from "@/domain/hegire";

/** Jour d'aujourd'hui à Paris (AAAA-MM-JJ). */
function aujourdhui(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

/**
 * Date hégirienne du jour dans la barre du haut (tous les profils) : « 7 Joumada ath-thania 1448 »,
 * suivie de l'arabe sur les écrans larges. Repli : le nom de l'appli.
 */
export function DateHegirienneBarre() {
  const d = dateHegirienne(aujourdhui());
  if (!d) return <span className="barre-app">Suivi cours Coran</span>;
  return (
    <span className="barre-app barre-hegire" title={libelleHegirienArabe(d)} suppressHydrationWarning>
      {libelleHegirien(d)}
      <span className="barre-hegire-ar" lang="ar" dir="rtl">
        {" · "}
        {libelleHegirienArabe(d)}
      </span>
    </span>
  );
}

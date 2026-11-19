import { titreArabe } from "@/domain/ciel";

/**
 * Titre de la page dans la barre : en calligraphie arabe dorée (Ruqʿa) avec le nom français dessous ;
 * s'il n'a pas de nom arabe, le titre français seul, comme avant. `sousTitre` remplace le nom français
 * (la fiche d'un élève : « سجلّ الطالب » puis son nom).
 * La calligraphie se trace de droite à gauche à l'arrivée sur la page.
 */
export function TitreCalligraphie({ titre, sousTitre }: { titre: string; sousTitre?: string }) {
  const ar = titreArabe(titre);
  if (!ar) return <span className="barre-titre">{sousTitre ?? titre}</span>;
  // Les titres longs rapetissent : le titre reste dans sa zone, à gauche du ciel de la mosquée.
  const taille = ar.length > 10 ? "long" : ar.length > 7 ? "moyen" : undefined;
  return (
    <span className="barre-titre barre-titre-double">
      <span className="barre-titre-ar" lang="ar" dir="rtl" data-taille={taille}>
        {ar}
      </span>
      <span className="barre-titre-fr" data-long={(sousTitre ?? titre).length > 9 ? "" : undefined}>
        {sousTitre ?? titre}
      </span>
    </span>
  );
}

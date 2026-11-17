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
  return (
    <span className="barre-titre barre-titre-double">
      <span className="barre-titre-ar" lang="ar" dir="rtl">
        {ar}
      </span>
      <span className="barre-titre-fr">{sousTitre ?? titre}</span>
    </span>
  );
}

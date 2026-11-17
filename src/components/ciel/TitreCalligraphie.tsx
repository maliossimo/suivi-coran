import { titreArabe } from "@/domain/ciel";

/**
 * Titre de la page dans la barre : en calligraphie arabe dorée (Ruqʿa) avec le nom français dessous ;
 * s'il n'a pas de nom arabe (le nom d'un élève…), le titre français seul, comme avant.
 * La calligraphie se trace de droite à gauche à l'arrivée sur la page.
 */
export function TitreCalligraphie({ titre }: { titre: string }) {
  const ar = titreArabe(titre);
  if (!ar) return <span className="barre-titre">{titre}</span>;
  return (
    <span className="barre-titre barre-titre-double">
      <span className="barre-titre-ar" lang="ar" dir="rtl">
        {ar}
      </span>
      <span className="barre-titre-fr">{titre}</span>
    </span>
  );
}

"use client";

import { Vibrate } from "lucide-react";
import { useEffect, useState } from "react";
import { activerRetours, retoursActives, retourSensoriel } from "./retourSensoriel";

/** « Mon compte » : sons et vibrations discrets quand une action réussit (sur ce téléphone). */
export function ReglageRetours() {
  const [actifs, setActifs] = useState(true);
  useEffect(() => setActifs(retoursActives()), []);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actifs}
      className="coran-interrupteur"
      onClick={() => {
        activerRetours(!actifs);
        setActifs(!actifs);
        if (!actifs) retourSensoriel();
      }}
    >
      <Vibrate size={18} aria-hidden="true" />
      <span>Petit son et vibration quand c’est enregistré</span>
      <span className="coran-interrupteur-pastille" aria-hidden="true" />
    </button>
  );
}

"use client";

import { CloudUpload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appelsEnAttente, relancerAppels } from "./appelsEnAttente";

/** Bandeau des appels gardés sans réseau, envoyés tout seuls au retour de la connexion. */
export function EnvoiAppels() {
  const router = useRouter();
  const [nb, setNb] = useState(0);

  useEffect(() => {
    const compter = () => setNb(appelsEnAttente().length);
    const relancer = async () => {
      if ((await relancerAppels()) > 0) router.refresh();
      compter();
    };
    compter();
    void relancer();
    window.addEventListener("online", relancer);
    window.addEventListener("appels-en-attente", compter);
    return () => {
      window.removeEventListener("online", relancer);
      window.removeEventListener("appels-en-attente", compter);
    };
  }, [router]);

  if (!nb) return null;
  return (
    <p className="bandeau-appels" role="status">
      <CloudUpload size={18} aria-hidden="true" />
      {nb} appel{nb > 1 ? "s" : ""} gardé{nb > 1 ? "s" : ""} sur le téléphone : envoi automatique au retour du
      réseau.
    </p>
  );
}

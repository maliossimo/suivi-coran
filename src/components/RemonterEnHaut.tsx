"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Sur les longues pages (fiche du mois, longue sourate) : un bouton discret pour remonter en haut. */
export function RemonterEnHaut() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let image = 0;
    const verifier = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => setVisible(window.scrollY > window.innerHeight * 1.5));
    };
    verifier();
    window.addEventListener("scroll", verifier, { passive: true });
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", verifier);
    };
  }, []);
  return (
    <button
      type="button"
      className={visible ? "remonter-en-haut visible" : "remonter-en-haut"}
      aria-label="Remonter en haut"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}

import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "supabase/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // Architecture en couches : l'interface ne parle pas directement à Supabase.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*"],
              message: "Accès à Supabase uniquement depuis src/lib/supabase ou src/repositories.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/supabase/**", "src/repositories/**", "src/middleware.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Le domaine reste pur : aucune dépendance au framework ni à la base.
    files: ["src/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["@supabase/*", "next", "next/*", "react", "@/lib/*", "@/repositories/*"] },
      ],
    },
  },
];

export default config;

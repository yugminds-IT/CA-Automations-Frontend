import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".archify/**"]),
  {
    rules: {
      // Same policy as ca-backend-nest.
      "@typescript-eslint/no-explicit-any": "off",
      // ponytail: React Compiler rules flag ~90 existing patterns; warn until those components are reworked, then make them errors.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

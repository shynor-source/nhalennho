import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Native flat config, per the Next.js ESLint documentation (no FlatCompat).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // OpenNext/Wrangler build output (ADR-0013)
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;

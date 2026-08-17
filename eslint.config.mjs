import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Android module is Kotlin and its build output is not ours: the
    // Roborazzi HTML report vendors a minified materialize.js, which this
    // config happily linted and failed on. "build/**" only matches the root.
    "android/**",
  ]),
]);

export default eslintConfig;

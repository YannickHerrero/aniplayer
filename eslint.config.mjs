import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // We use idiomatic fetch-on-mount effects (set loading → await → set
      // data) and fragment parsing on mount; this rule flags the synchronous
      // setState that starts those, which is intentional here.
      "react-hooks/set-state-in-effect": "off",
      // Allow intentionally-unused args/vars prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "src-tauri/resources/**",
    "src-tauri/binaries/**",
    "next-env.d.ts",
  ]),
])

export default eslintConfig

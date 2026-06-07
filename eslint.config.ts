import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint, { parser as eslintParserTypeScript } from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/node_modules/**", "dist/**", "frontend/build/**", "frontend/.react-router/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: ["./tsconfig.eslint.json", "./frontend/tsconfig.json"],
      },
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: ["**/*.{js,cjs,mjs,jsx}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
);

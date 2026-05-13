import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    ignores: [
      "node_modules/",
      "dist/",
      "*.tsbuildinfo",
      "artifacts/*/dist/",
      "artifacts/el-principe-mestizo/dist/",
      ".replit-artifact/",
      "scripts/node_modules/",
    ],
  },
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        AbortSignal: "readonly",
        AbortController: "readonly",
        fetch: "readonly",
        URL: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "readonly",
      },
    },
    rules: {
      // Desactivar reglas demasiado estrictas para un proyecto migrando
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
      // Reglas de seguridad adicionales
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "security/detect-object-injection": "off",
    },
  },
  {
    // Archivos de test: reconocer Jest globals, permitir require() y console
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  {
    // Scripts: permitir require() y console
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
);

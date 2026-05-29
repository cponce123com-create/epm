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
      // Reglas estrictas (nivel error)
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-console": "error",
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
  {
    // External News (RSS aggregator standalone): permitir console para logging
    files: ["lib/external-news/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Cron routes: permitir console para logging de operaciones
    files: [
      "artifacts/api-server/src/routes/cron.ts",
      "artifacts/api-server/src/routes/externalNews.ts",
      "artifacts/api-server/src/routes/trends.ts",
      "artifacts/api-server/src/routes/summarize.ts",
      "artifacts/api-server/src/routes/dailyBriefing.ts",
      "artifacts/api-server/src/scripts/**/*.ts",
      "test/**/*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
);

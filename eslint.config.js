const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

// Variável EXPO_PUBLIC_* vai embutida no bundle: nunca use para segredo (AD-6).
const SECRET_NAME = "^EXPO_PUBLIC_.*(SECRET|PRIVATE|PASSWORD)";
const SECRET_MESSAGE =
  "EXPO_PUBLIC_* é embutida no bundle do app. Não use para segredo: use expo-secure-store ou um backend.";

module.exports = defineConfig([
  expoConfig,
  {
    // Pastas de ferramentas (skills, BMAD, tipos gerados pelo Expo) não são código do app.
    ignores: ["dist/*", "node_modules/*", "packages/*", ".claude/**", ".agent/**", ".agents/**", "_bmad/**", "_bmad-output/**", ".expo/**"],
  },
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `MemberExpression[object.property.name='env'][property.name=/${SECRET_NAME}/]`,
          message: SECRET_MESSAGE,
        },
        {
          selector: `MemberExpression[object.property.name='env'][property.value=/${SECRET_NAME}/]`,
          message: SECRET_MESSAGE,
        },
      ],
      // Novas regras do React Compiler introduzidas no eslint-plugin-react-hooks@7 (eslint-config-expo@57).
      // Acusam 199 ocorrências pré-existentes (147 falsos positivos em hooks que retornam refs + estado).
      // Mantemos rules-of-hooks e exhaustive-deps ativos; adoção gradual rastreada em docs/migracao-sdk-57.md.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    // Scripts utilitários rodam em Node puro (CommonJS) — precisam dos globals
    // de Node e de require(); sem isso o ESLint acusava ~170 no-undef falsos.
    files: ["scripts/**/*.js", "*.config.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

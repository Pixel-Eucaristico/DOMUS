const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

// Variável EXPO_PUBLIC_* vai embutida no bundle: nunca use para segredo (AD-6).
const SECRET_NAME = "^EXPO_PUBLIC_.*(SECRET|PRIVATE|PASSWORD)";
const SECRET_MESSAGE =
  "EXPO_PUBLIC_* é embutida no bundle do app. Não use para segredo: use expo-secure-store ou um backend.";

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", "packages/*"],
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

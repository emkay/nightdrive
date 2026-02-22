import eslint from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      semi: ["error", "never"],
      "@stylistic/member-delimiter-style": ["error", {
        multiline: { delimiter: "none" },
        singleline: { delimiter: "comma", requireLast: false },
      }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    ignores: ["dist/"],
  },
)

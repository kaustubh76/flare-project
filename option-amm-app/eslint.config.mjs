// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      // Customize rules for your project
      "react/react-in-jsx-scope": "off", // Not needed in Next.js with automatic JSX runtime
      "@next/next/no-html-link-for-pages": "warn",
      "no-unused-vars": "warn",
    },
  },
];

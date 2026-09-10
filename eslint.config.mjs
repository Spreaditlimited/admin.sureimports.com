import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
    "@typescript-eslint/no-wrapper-object-types": "off",
    "jsx-a11y/alt-text": "off",
    "prefer-const": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/error-boundaries": "off",
    "react-hooks/immutability": "off",
    "react-hooks/incompatible-library": "off",
    "react-hooks/purity": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/static-components": "off",
    "@typescript-eslint/no-require-imports": "off",
    "react/no-unescaped-entities": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];

export default eslintConfig;

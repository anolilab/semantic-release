import { createConfig } from "@anolilab/eslint-config";

export default createConfig(
    {
        css: false,
        ignores: [
            "dist",
            "node_modules",
            "coverage",
            "__fixtures__",
            "__docs__",
            "examples",
            "vitest.config.ts",
            ".secretlintrc.cjs",
            "tsconfig.eslint.json",
            ".prettierrc.cjs",
            "packem.config.ts",
            "README.md",
        ],
        jsx: false,
        react: false,
        typescript: {
            tsconfigPath: "tsconfig.eslint.json",
        },
    },
    {
        ignores: ["**/__tests__"],
        rules: {
            "unicorn/prefer-module": "off",
        },
    },
);

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
            "README.md",
        ],
        jsx: false,
        react: false,
        typescript: {
            tsconfigPath: "tsconfig.eslint.json",
        },
    },
    {
        rules: {
            "no-underscore-dangle": "off",
        },
    },
    {
        ignores: ["**/__tests__"],
        rules: {
            "unicorn/no-null": "off",
            "unicorn/prefer-module": "off",
            "vitest/require-mock-type-parameters": "off",
        },
    },
);

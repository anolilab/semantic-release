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
        // Enable this after the lint errors are fixed.
        // typescript: {
        //    tsconfigPath: "tsconfig.json",
        // },
    },
    {
        rules: {
            "no-underscore-dangle": "off",
        },
    },
    {
        ignores: ["**/__tests__"],
        rules: {
            "unicorn/prefer-module": "off",
        },
    },
);

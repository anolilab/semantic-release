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
        linterOptions: {
            reportUnusedDisableDirectives: "off",
        },
        rules: {
            "e18e/ban-dependencies": "off",
            "no-underscore-dangle": "off",
        },
    },
    {
        files: ["**/src/**", "**/__tests__/**"],
        rules: {
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "unicorn/filename-case": "off",
            "unicorn/no-null": "off",
            "unicorn/prefer-module": "off",
            "vitest/require-mock-type-parameters": "off",
        },
    },
);

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
        linterOptions: {
            reportUnusedDisableDirectives: "off",
        },
        rules: {
            "@typescript-eslint/no-restricted-types": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-type-assertion": "off",
            "no-restricted-syntax": "off",
            "unicorn/filename-case": "off",
            "unicorn/prefer-module": "off",
            "vitest/require-mock-type-parameters": "off",
        },
    },
);

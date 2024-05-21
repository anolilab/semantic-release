// eslint-disable-next-line import/no-commonjs
const { defineConfig } = require("@anolilab/eslint-config/define-config");
// eslint-disable-next-line import/no-commonjs
const globals = require("@anolilab/eslint-config/globals");

/** @ts-check */
module.exports = defineConfig({
    env: {
        // Your environments (which contains several predefined global variables)
        // Most environments are loaded automatically if our rules are added
    },
    extends: ["@anolilab/eslint-config"],
    globals: {
        ...globals.es2021,
        // Your global variables (setting to false means it's not allowed to be reassigned)
        // myGlobal: false
    },
    ignorePatterns: ["!**/*"],
    overrides: [
        {
            files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
            // Set parserOptions.project for the project to allow TypeScript to create the type-checker behind the scenes when we run linting
            parserOptions: {},
            rules: {},
        },
        {
            files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/*.js", "**/*.jsx"],
            // Set parserOptions.project for the project to allow TypeScript to create the type-checker behind the scenes when we run linting
            parserOptions: {},
            rules: {},
        },
        {
            files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
            // Set parserOptions.project for the project to allow TypeScript to create the type-checker behind the scenes when we run linting
            parserOptions: {},
            rules: {
                "security/detect-object-injection": "off",
            },
        },
        {
            files: ["**/*.test.js"],
            rules: {
                "security/detect-non-literal-fs-filename": "off",
            },
        },
        {
            files: ["**/*.js"],
            rules: {
                "func-style": "off",
                "no-underscore-dangle": "off",
            },
        },
        {
            files: ["**/*.mdx"],
            rules: {
                "jsx-a11y/anchor-has-content": "off",
                // @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/917
                "jsx-a11y/heading-has-content": "off",
            },
        },
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
    },
    root: true,
    rules: {
        // Customize your rules
    },
});

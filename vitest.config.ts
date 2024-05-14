/// <reference types="vitest" />
import { defineConfig, configDefaults, coverageConfigDefaults } from "vitest/config";

const VITEST_SEQUENCE_SEED = Date.now();

console.log("VITEST_SEQUENCE_SEED", VITEST_SEQUENCE_SEED);

// https://vitejs.dev/config/
export default defineConfig({
    test: {
        ...configDefaults,
        coverage: {
            ...coverageConfigDefaults,
            provider: "v8",
            reporter: ["clover", "cobertura", "lcov", "text"],
            include: ["src"],
            exclude: ["__fixtures__/**", "__bench__/**", "scripts/**"],
        },
        environment: "node",
        testTimeout: 10000,
        reporters: process.env.CI_PREFLIGHT ? ["basic", "github-actions"] : ["basic"],
        sequence: {
            seed: VITEST_SEQUENCE_SEED,
        },
        typecheck: {
            enabled: false,
        },
        exclude: [...configDefaults.exclude, "__fixtures__/**"],
    },
});

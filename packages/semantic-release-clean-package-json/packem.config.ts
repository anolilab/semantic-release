import type { BuildConfig } from "@visulima/packem/config";
import { defineConfig } from "@visulima/packem/config";
import transformer from "@visulima/packem/transformer/esbuild";

export default defineConfig({
    rollup: {
        license: {
            path: "./LICENSE.md",
        },
    },
    transformer,
    validation: {
        packageJson: {
            // semantic-release does not support the "exports" field
            exports: false,
            // TODO: Remove this once packem fixed cache handling
            typesVersions: false,
        },
    },
}) as BuildConfig;

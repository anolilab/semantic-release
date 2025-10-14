import type { BuildConfig } from "@visulima/packem/config";
import { defineConfig } from "@visulima/packem/config";
import transformer from "@visulima/packem/transformer/esbuild";

export default defineConfig({
    rollup: {
        license: {
            path: "./LICENSE.md",
        },
        requireCJS: {
            builtinNodeModules: true,
        },
    },
    transformer,
    validation: {
        packageJson: {
            // semantic-release does not support the "exports" field
            exports: false,
        },
        dependencies: {
            unused: {
                exclude: ["type-fest"],
            },
        },
    },
}) as BuildConfig;

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
    runtime: "node",
    transformer,
    validation: {
        dependencies: {
            unused: {
                exclude: ["type-fest"],
            },
        },
    },
}) as BuildConfig;

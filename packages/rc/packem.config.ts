import type { BuildConfig } from "@visulima/packem/config";
import { defineConfig } from "@visulima/packem/config";
import transformer from "@visulima/packem/transformer/esbuild";

export default defineConfig({
    cjsInterop: true,
    node10Compatibility: {
        typeScriptVersion: ">=5.0",
        writeToPackageJson: true,
    },
    rollup: {
        license: {
            path: "./LICENSE.md",
        },
        requireCJS: {
            builtinNodeModules: true,
        },
    },
    transformer,
    typedoc: {
        format: "inline",
        readmePath: "./README.md",
    },
    validation: {
        dependencies: {
            // @TODO: Remove this once packem fixed cache handling
            unused: {
                exclude: ["@visulima/fs", "@visulima/path", "ini", "ts-deepmerge"],
            },
        },
    },
}) as BuildConfig;

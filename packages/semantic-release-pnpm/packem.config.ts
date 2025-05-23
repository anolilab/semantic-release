import { defineConfig } from "@visulima/packem/config";
import transformer from "@visulima/packem/transformer/esbuild";

// eslint-disable-next-line import/no-unused-modules
export default defineConfig({
    rollup: {
        license: {
            path: "./LICENSE.md",
        },
        node10Compatibility: {
            writeToPackageJson: true,
            typeScriptVersion: ">=5.0",
        },
    },
    validation: {
        packageJson: {
            // semantic-release does not support the "exports" field
            exports: false,
        },
    },
    transformer,
    cjsInterop: true,
});

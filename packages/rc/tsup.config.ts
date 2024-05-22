import type { Options } from "tsup";
import { defineConfig } from "tsup";

// @ts-ignore
export default defineConfig((options: Options) => {
    return {
        ...options,
        treeshake: true,
        // react external https://github.com/vercel/turborepo/issues/360#issuecomment-1013885148
        external: ["semantic-release"],
        silent: !options.watch,
        minify: process.env["NODE_ENV"] === "production",
        minifyWhitespace: process.env["NODE_ENV"] === "production",
        incremental: !options.watch,
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: true,
        shims: true,
        target: ["es2022", "node18"],
        declaration: true,
        entry: ["src/index.ts"],
        format: ["esm", "cjs"],
    };
});

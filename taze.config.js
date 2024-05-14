import { defineConfig } from "taze";

export default defineConfig({
    // ignore packages from bumping
    exclude: ["eslint", "eslint-plugin-vitest"],
    ignorePaths: ["node_modules", "__tests__", "__fixtures__", "dist"],
    mode: "latest",
    recursive: true,
    // write to package.json
    write: true,
});

import { defineConfig } from "taze";

export default defineConfig({
    // ignore packages from bumping
    exclude: [
        "@types/node",
    ],
    // write to package.json
    write: true,
    ignorePaths: ["node_modules", "packages/**/dist", "packages/**/coverage", "packages/**/__fixtures__", "packages/**/__tests__"],
    recursive: true,
    mode: "latest",
});

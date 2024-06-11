import { readFile } from "fs/promises";

import { getVitestConfig } from "../../tools/get-vitest-config";
import { URL } from "url";

const pkg = JSON.parse(await readFile(new URL("./node_modules/semantic-release/package.json", import.meta.url), { encoding: "utf-8" }));

console.log("\nTesting with semantic-release version", pkg.version, "\n");

const config = getVitestConfig();

export default config;

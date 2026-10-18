import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import createInlinePluginCreator from "../src/create-inline-plugin-creator";
import type { MultiContext, Package, SemanticReleaseContext } from "../src/types";
import { gitCommitAll, gitInit } from "./helpers/git";

const UNAVAILABLE_COMMIT = "0123456789abcdef0123456789abcdef01234567";

/**
 * Create a repository with one package, committed.
 * @returns The repository and the package.
 */
const setUpWorkspace = (): { cwd: string; npmPackage: Package } => {
    const cwd = gitInit();
    const directory = resolve(cwd, "packages/a");

    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "package.json"), '{ "name": "a", "version": "1.0.0" }\n');
    gitCommitAll(cwd, "feat: initial commit");

    const npmPackage = {
        deps: [],
        dir: directory,
        localDeps: [],
        manifest: { name: "a", version: "1.0.0" },
        name: "a",
        options: {},
        path: resolve(directory, "package.json"),
        plugins: {},
    } as unknown as Package;

    return { cwd, npmPackage };
};

const createContext = (cwd: string, lastRelease?: SemanticReleaseContext["lastRelease"]): SemanticReleaseContext => {
    return { branch: { name: "master" }, cwd, env: {}, lastRelease, options: {}, stderr: process.stderr, stdout: process.stdout };
};

const createMultiContext = (cwd: string): MultiContext => {
    return { cwd, env: {}, globalOptions: {}, inputOptions: {}, stderr: process.stderr, stdout: process.stdout };
};

describe("createInlinePluginCreator()", () => {
    describe("analyzeCommits()", () => {
        it("should fail when the last release commit is not available, e.g. in a shallow clone", async () => {
            expect.assertions(1);

            const { cwd, npmPackage } = setUpWorkspace();
            const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(cwd), {})(npmPackage);
            const context = createContext(cwd, { gitHead: UNAVAILABLE_COMMIT, gitTag: "a@1.0.0" } as SemanticReleaseContext["lastRelease"]);

            await expect(inlinePlugin.analyzeCommits?.(undefined, context)).rejects.toThrow(
                `The last release commit ${UNAVAILABLE_COMMIT} (a@1.0.0) is not available in this clone`,
            );
        });

        it("should analyze commits without a last release", async () => {
            expect.assertions(1);

            const { cwd, npmPackage } = setUpWorkspace();
            const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(cwd), {})(npmPackage);

            await expect(inlinePlugin.analyzeCommits?.(undefined, createContext(cwd))).resolves.toBeNull();
        });
    });
});

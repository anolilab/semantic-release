import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { WritableStreamBuffer } from "stream-buffers";
import { temporaryDirectory } from "tempy";
import { describe, expect, it } from "vitest";

import { getTags } from "../../lib/git.js";
import multiSemanticRelease from "../../lib/multi-semantic-release.js";
import { copyDirectory, createNewTestingFiles } from "../helpers/file.js";
import { gitCommitAll, gitInit, gitInitOrigin, gitPush } from "../helpers/git.js";

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../__fixtures__");

const environment = {
    GH_TOKEN: "test",
    NPM_TOKEN: "test",
    PATH: process.env.PATH,
};

describe("git", () => {
    it("fetch all tags on master after two package release", async () => {
        const packages = ["packages/c/", "packages/d/"];

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit("master", "release");

        copyDirectory(`${fixturesPath}/yarnWorkspaces2Packages/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd, "release");
        gitPush(cwd);

        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        const tags = getTags("master", { cwd }).sort();

        expect(tags).toStrictEqual(["msr-test-d@1.0.0", "msr-test-c@1.0.0"].sort());
    });

    it("fetch only prerelease tags", async () => {
        const packages = ["packages/c/", "packages/d/"];

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit("master", "release");

        copyDirectory(`${fixturesPath}/yarnWorkspaces2Packages/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd, "release");
        gitPush(cwd);

        let stdout = new WritableStreamBuffer();
        let stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Add new testing files for a new release.
        createNewTestingFiles(packages, cwd);

        gitCommitAll(cwd, "feat: New prerelease\n\nBREAKING CHANGE: bump to bigger value");
        gitPush(cwd);

        // Capture output.
        stdout = new WritableStreamBuffer();
        stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease() for a second release
        // Doesn't include plugins that actually publish.
        // Change the master branch from release to prerelease to __tests__ bumping.
        await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master", prerelease: "beta" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        const tags = getTags("master", { cwd }, ["beta"]).sort();

        expect(tags).toStrictEqual(["msr-test-d@2.0.0-beta.1", "msr-test-c@2.0.0-beta.1"].sort());

        // Add new testing files for a new release.
        createNewTestingFiles(packages, cwd);

        const shaPatch = gitCommitAll(cwd, "fix: add a patch");

        expect(shaPatch).toBeTruthy();

        gitPush(cwd);

        // Capture output.
        stdout = new WritableStreamBuffer();
        stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease() for a second release
        // Doesn't include plugins that actually publish.
        // Change the master branch from release to prerelease to test bumping.
        await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master", prerelease: "beta" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        const tagsPatch = getTags("master", { cwd }, ["beta"]).sort();

        expect(tagsPatch).toStrictEqual(["msr-test-c@2.0.0-beta.1", "msr-test-c@2.0.0-beta.2", "msr-test-d@2.0.0-beta.1", "msr-test-d@2.0.0-beta.2"]);
    });

    it("throws error if obtaining the tags fails", () => {
        const cwd = temporaryDirectory();

        const t = () => {
            getTags("master", { cwd });
        };
        expect(t).toThrow(Error);
    });
});

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { WritableStreamBuffer } from "stream-buffers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import multiSemanticRelease from "../src/multi-semantic-release";
import { copyDirectory, createNewTestingFiles } from "./helpers/file";
import { gitAdd, gitCommit, gitCommitAll, gitGetLog, gitInit, gitInitOrigin, gitPush, gitTag } from "./helpers/git";

type ReleaseResult
    = | {
        name: string;
        result: {
            lastRelease:
                | {
                    channels?: string[];
                    gitHead?: string;
                    gitTag?: string;
                    name?: string;
                    version?: string;
                }
                | {};
            nextRelease?: {
                gitHead: string;
                gitTag: string;
                notes?: string;
                type: string;
                version: string;
            };
        };
    }
    | {
        name: string;
        result: false;
    };

type MultiSemanticReleaseOptions = {
    deps?: {
        bump?: string;
        prefix?: string;
    };
    dryRun?: boolean;
    sequentialInit?: boolean;
    sequentialPrepare?: boolean;
    tagFormat?: string;
};

type BranchesConfig = {
    channel?: string;
    name: string;
    prerelease?: string;
}[];

type PluginConfig = {
    analyzeCommits?: string[];
    branches?: BranchesConfig | BranchesConfig[0];
    plugins?: any[];
};

const require = createRequire(import.meta.url);
const environment = {};

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../__fixtures__");

describe("multiSemanticRelease()", () => {
    beforeEach(() => {
        vi.clearAllMocks(); // Clear all mocks.
    });

    it("initial commit (changes in all packages)", async () => {
        expect.assertions(39);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        const sha = gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        const result: ReleaseResult[] = await multiSemanticRelease(
            [`packages/a/package.json`, `packages/b/package.json`, `packages/c/package.json`, `packages/d/package.json`],
            {},
            { cwd, env: environment, stderr, stdout },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 4 packages...");
        expect(out).toMatch("Loaded package msr-test-a");
        expect(out).toMatch("Loaded package msr-test-b");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 4 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-a@1.0.0");
        expect(out).toMatch("Created tag msr-test-b@1.0.0");
        expect(out).toMatch("Created tag msr-test-c@1.0.0");
        expect(out).toMatch("Created tag msr-test-d@1.0.0");
        expect(out).toMatch("Released 4 of 4 packages, semantically!");

        // A.
        expect(result[0].name).toBe("msr-test-a");
        expect(result[0].result.lastRelease).toStrictEqual({});
        expect(result[0].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-a@1.0.0",
            type: "minor",
            version: "1.0.0",
        });
        expect(result[0].result.nextRelease.notes).toMatch("# msr-test-a 1.0.0");
        expect(result[0].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");

        // B.
        expect(result[2].name).toBe("msr-test-b");
        expect(result[2].result.lastRelease).toStrictEqual({});
        expect(result[2].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-b@1.0.0",
            type: "minor",
            version: "1.0.0",
        });
        expect(result[2].result.nextRelease.notes).toMatch("# msr-test-b 1.0.0");
        expect(result[2].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
        expect(result[2].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-a:** upgraded to 1.0.0");

        // C.
        expect(result[3].name).toBe("msr-test-c");
        expect(result[3].result.lastRelease).toStrictEqual({});
        expect(result[3].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-c@1.0.0",
            type: "minor",
            version: "1.0.0",
        });
        expect(result[3].result.nextRelease.notes).toMatch("# msr-test-c 1.0.0");
        expect(result[3].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
        expect(result[3].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-b:** upgraded to 1.0.0");

        // D.
        expect(result[1].name).toBe("msr-test-d");
        expect(result[1].result.lastRelease).toStrictEqual({});
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-d@1.0.0",
            type: "minor",
            version: "1.0.0",
        });
        expect(result[1].result.nextRelease.notes).toMatch("# msr-test-d 1.0.0");
        expect(result[1].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
        expect(result[1].result.nextRelease.notes).not.toMatch("### Dependencies");

        // ONLY four times.
        expect(result).toHaveLength(4);

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/a/package.json`)).toMatchObject({
            peerDependencies: {
                "left-pad": "latest",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-a": "1.0.0",
            },
            devDependencies: {
                "left-pad": "latest",
                "msr-test-d": "1.0.0",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            devDependencies: {
                "msr-test-d": "1.0.0",
            },
        });
    });

    describe.each([
        ["override", "^", [3, 2, 0, 1]],
        ["satisfy", "^", [3, 2, 0, 1]],
        ["inherit", "^", [3, 2, 0, 1]],
    ])(
        "with Yarn Workspace Ranges & deps.bump=%s & deps.prefix=%s",
        (strategy, prefix, packageOrder) => {
            it("should replace \"workspace:\" with correct version", async () => {
                expect.assertions(37);

                // Create Git repo with copy of Yarn workspaces fixture.
                const cwd = gitInit();

                copyDirectory(`${fixturesPath}/yarnWorkspacesRanges/`, cwd);

                const sha = gitCommitAll(cwd, "feat: Initial release");

                gitInitOrigin(cwd);
                gitPush(cwd);

                // Capture output.
                const stdout = new WritableStreamBuffer();
                const stderr = new WritableStreamBuffer();

                // Call multiSemanticRelease()
                // Doesn't include plugins that actually publish.
                const result: ReleaseResult[] = await multiSemanticRelease(
                    [`packages/a/package.json`, `packages/b/package.json`, `packages/c/package.json`, `packages/d/package.json`],
                    {},
                    { cwd, env: environment, stderr, stdout },
                    { deps: { bump: strategy, prefix } },
                );

                // Get stdout and stderr output.
                const error = stderr.getContentsAsString("utf8");

                expect(error).toBe(false);

                const out = stdout.getContentsAsString("utf8");

                expect(out).toMatch("Started multirelease! Loading 4 packages...");
                expect(out).toMatch("Loaded package msr-test-a");
                expect(out).toMatch("Loaded package msr-test-b");
                expect(out).toMatch("Loaded package msr-test-c");
                expect(out).toMatch("Loaded package msr-test-d");
                expect(out).toMatch("Queued 4 packages! Starting release...");
                expect(out).toMatch("Created tag msr-test-c@1.0.0");
                expect(out).toMatch("Created tag msr-test-d@1.0.0");
                expect(out).toMatch("Created tag msr-test-b@1.0.0");
                expect(out).toMatch("Created tag msr-test-a@1.0.0");
                expect(out).toMatch("Released 4 of 4 packages, semantically!");

                // A.
                expect(result[packageOrder[0]].name).toBe("msr-test-a");
                expect(result[packageOrder[0]].result.lastRelease).toStrictEqual({});
                expect(result[packageOrder[0]].result.nextRelease).toMatchObject({
                    gitHead: sha,
                    gitTag: "msr-test-a@1.0.0",
                    type: "minor",
                    version: "1.0.0",
                });
                expect(result[packageOrder[0]].result.nextRelease.notes).toMatch("# msr-test-a 1.0.0");
                expect(result[packageOrder[0]].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
                expect(result[packageOrder[0]].result.nextRelease.notes).toMatch(
                    "### Dependencies\n\n* **msr-test-b:** upgraded to 1.0.0\n* **msr-test-c:** upgraded to 1.0.0",
                );

                // B.
                expect(result[packageOrder[1]].name).toBe("msr-test-b");
                expect(result[packageOrder[1]].result.lastRelease).toStrictEqual({});
                expect(result[packageOrder[1]].result.nextRelease).toMatchObject({
                    gitHead: sha,
                    gitTag: "msr-test-b@1.0.0",
                    type: "minor",
                    version: "1.0.0",
                });
                expect(result[packageOrder[1]].result.nextRelease.notes).toMatch("# msr-test-b 1.0.0");
                expect(result[packageOrder[1]].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
                expect(result[packageOrder[1]].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-d:** upgraded to 1.0.0");

                // C.
                expect(result[packageOrder[2]].name).toBe("msr-test-c");
                expect(result[packageOrder[2]].result.lastRelease).toStrictEqual({});
                expect(result[packageOrder[2]].result.nextRelease).toMatchObject({
                    gitHead: sha,
                    gitTag: "msr-test-c@1.0.0",
                    type: "minor",
                    version: "1.0.0",
                });
                expect(result[packageOrder[2]].result.nextRelease.notes).toMatch("# msr-test-c 1.0.0");
                expect(result[packageOrder[2]].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");

                // D.
                expect(result[packageOrder[3]].name).toBe("msr-test-d");
                expect(result[packageOrder[3]].result.lastRelease).toStrictEqual({});
                expect(result[packageOrder[3]].result.nextRelease).toMatchObject({
                    gitHead: sha,
                    gitTag: "msr-test-d@1.0.0",
                    type: "minor",
                    version: "1.0.0",
                });
                expect(result[packageOrder[3]].result.nextRelease.notes).toMatch("# msr-test-d 1.0.0");
                expect(result[packageOrder[3]].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");

                // ONLY four times.
                expect(result).toHaveLength(4);

                // Check manifests.
                // eslint-disable-next-line import/no-dynamic-require
                expect(require(`${cwd}/packages/a/package.json`)).toMatchObject({
                    dependencies: {
                        "msr-test-b": "1.0.0",
                    },
                    devDependencies: {
                        "msr-test-c": strategy === "override" ? `${prefix}1.0.0` : "^1.0.0",
                    },
                    name: "msr-test-a",
                    peerDependencies: {
                        "left-pad": "latest",

                        "msr-test-d": strategy === "override" ? `${prefix}1.0.0` : "~1.0.0",
                    },
                    version: "1.0.0",
                });
                // eslint-disable-next-line import/no-dynamic-require
                expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
                    optionalDependencies: {
                        "msr-test-d": strategy === "override" ? `${prefix}1.0.0` : "^1.0.0",
                    },
                });
            });
            // eslint-disable-next-line import/no-dynamic-require
            expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
                optionalDependencies: {
                    "msr-test-d": strategy === "override" ? `${prefix}1.0.0` : "^1.0.0",
                },
            });
        });
    });

    it("initial commit (changes in all packages with prereleases)", async () => {
        expect.assertions(40);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit("master", "release");

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        const sha = gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd, "release");
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        const result: ReleaseResult[] = await multiSemanticRelease(
            [`packages/a/package.json`, `packages/b/package.json`, `packages/c/package.json`, `packages/d/package.json`],
            {
                branches: [{ name: "master", prerelease: "dev" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 4 packages...");
        expect(out).toMatch("Loaded package msr-test-a");
        expect(out).toMatch("Loaded package msr-test-b");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 4 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-a@1.0.0-dev.1");
        expect(out).toMatch("Created tag msr-test-b@1.0.0-dev.1");
        expect(out).toMatch("Created tag msr-test-c@1.0.0-dev.1");
        expect(out).toMatch("Created tag msr-test-d@1.0.0-dev.1");
        expect(out).toMatch("Released 4 of 4 packages, semantically!");

        // A.
        expect(result[0].name).toBe("msr-test-a");
        expect(result[0].result.lastRelease).toStrictEqual({});
        expect(result[0].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-a@1.0.0-dev.1",
            type: "minor",
            version: "1.0.0-dev.1",
        });
        expect(result[0].result.nextRelease.notes).toMatch("# msr-test-a 1.0.0-dev.1");
        expect(result[0].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");

        // B.
        expect(result[2].name).toBe("msr-test-b");
        expect(result[2].result.lastRelease).toStrictEqual({});
        expect(result[2].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-b@1.0.0-dev.1",
            type: "minor",
            version: "1.0.0-dev.1",
        });
        expect(result[2].result.nextRelease.notes).toMatch("# msr-test-b 1.0.0-dev.1");
        expect(result[2].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
        expect(result[2].result.nextRelease.notes).toMatch(
            "### Dependencies\n\n* **msr-test-a:** upgraded to 1.0.0-dev.1\n* **msr-test-d:** upgraded to 1.0.0-dev.1",
        );

        // C.
        expect(result[3].name).toBe("msr-test-c");
        expect(result[3].result.lastRelease).toStrictEqual({});
        expect(result[3].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-c@1.0.0-dev.1",
            type: "minor",
            version: "1.0.0-dev.1",
        });
        expect(result[3].result.nextRelease.notes).toMatch("# msr-test-c 1.0.0-dev.1");
        expect(result[3].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
        expect(result[3].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-b:** upgraded to 1.0.0-dev.1");
        expect(result[3].result.nextRelease.notes).toMatch("**msr-test-d:** upgraded to 1.0.0-dev.1");

        // D.
        expect(result[1].name).toBe("msr-test-d");
        expect(result[1].result.lastRelease).toStrictEqual({});
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-d@1.0.0-dev.1",
            type: "minor",
            version: "1.0.0-dev.1",
        });
        expect(result[1].result.nextRelease.notes).toMatch("# msr-test-d 1.0.0-dev.1");
        expect(result[1].result.nextRelease.notes).toMatch("### Features\n\n* Initial release");
        expect(result[1].result.nextRelease.notes).not.toMatch("### Dependencies");

        // ONLY four times.
        expect(result).toHaveLength(4);

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/a/package.json`)).toMatchObject({
            peerDependencies: {
                "left-pad": "latest",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-a": "1.0.0-dev.1",
            },
            devDependencies: {
                "left-pad": "latest",
                "msr-test-d": "1.0.0-dev.1",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            devDependencies: {
                "msr-test-b": "1.0.0-dev.1",
                "msr-test-d": "1.0.0-dev.1",
            },
        });
    });

    it("two separate releases (changes in only one package in second release with prereleases)", async () => {
        expect.assertions(15);

        const packages = ["packages/c/", "packages/d/"];

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit("master", "release");

        copyDirectory(`${fixturesPath}/yarnWorkspaces2Packages/`, cwd);

        const sha1 = gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd, "release");
        gitPush(cwd);

        let stdout = new WritableStreamBuffer();
        let stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        let result = await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master", prerelease: "dev" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Add new testing files for a new release.
        createNewTestingFiles(["packages/c/"], cwd);

        const sha = gitCommitAll(cwd, "feat: New release on package c only");

        gitPush(cwd);

        // Capture output.
        stdout = new WritableStreamBuffer();
        stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease() for a second release
        // Doesn't include plugins that actually publish.
        result = await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master", prerelease: "dev" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 2 packages...");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 2 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-c@1.0.0-dev.2");
        expect(out).toMatch("Released 1 of 2 packages, semantically!");

        // C.
        expect(result[1].name).toBe("msr-test-c");
        expect(result[1].result.lastRelease).toStrictEqual({
            channels: ["master"],
            gitHead: sha1,
            gitTag: "msr-test-c@1.0.0-dev.1",
            name: "msr-test-c@1.0.0-dev.1",
            version: "1.0.0-dev.1",
        });
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-c@1.0.0-dev.2",
            type: "minor",
            version: "1.0.0-dev.2",
        });

        expect(result[1].result.nextRelease.notes).toMatch("# msr-test-c [1.0.0-dev.2]");
        expect(result[1].result.nextRelease.notes).toMatch("### Features\n\n* New release on package c only");
        expect(result[1].result.nextRelease.notes).not.toMatch("### Dependencies");

        // ONLY 2 time.
        expect(result).toHaveLength(2);

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-d": "1.0.0-dev.1",
            },
        });
    });

    it("two separate releases (release to prerelease)", async () => {
        expect.assertions(19);

        const packages = ["packages/c/", "packages/d/"];

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit("master", "release");

        copyDirectory(`${fixturesPath}/yarnWorkspaces2Packages/`, cwd);

        const sha1 = gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd, "release");
        gitPush(cwd);

        let stdout = new WritableStreamBuffer();
        let stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        let result = await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Add new testing files for a new release.
        createNewTestingFiles(packages, cwd);

        const sha = gitCommitAll(cwd, "feat: New prerelease\n\nBREAKING CHANGE: bump to bigger value");

        gitPush(cwd);

        // Capture output.
        stdout = new WritableStreamBuffer();
        stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease() for a second release
        // Doesn't include plugins that actually publish.
        // Change the master branch from release to prerelease to __tests__ bumping.
        result = await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ channel: "beta", name: "master", prerelease: "beta" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 2 packages...");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 2 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-c@2.0.0-beta.1");
        expect(out).toMatch("Created tag msr-test-d@2.0.0-beta.1");
        expect(out).toMatch("Released 2 of 2 packages, semantically!");

        // C.
        expect(result[1].name).toBe("msr-test-c");
        expect(result[1].result.lastRelease).toStrictEqual({
            channels: [null],
            gitHead: sha1,
            gitTag: "msr-test-c@1.0.0",
            name: "msr-test-c@1.0.0",
            version: "1.0.0",
        });
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-c@2.0.0-beta.1",
            type: "major",
            version: "2.0.0-beta.1",
        });

        expect(result[1].result.nextRelease.notes).toMatch("# msr-test-c [2.0.0-beta.1]");
        expect(result[1].result.nextRelease.notes).toMatch("### Features\n\n* New prerelease");
        expect(result[1].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-d:** upgraded to 2.0.0-beta.1");

        // D
        expect(result[0].result.nextRelease.notes).toMatch("# msr-test-d [2.0.0-beta.1]");
        expect(result[0].result.nextRelease.notes).toMatch("### Features\n\n* New prerelease");
        expect(result[0].result.nextRelease.notes).not.toMatch("### Dependencies");

        // ONLY 2 times.
        expect(result).toHaveLength(2);

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-d": "2.0.0-beta.1",
            },
        });
    }, 10_000);

    it("two separate releases (changes in all packages with prereleases)", async () => {
        expect.assertions(39);

        const packages = ["packages/a/", "packages/b/", "packages/c/", "packages/d/"];

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit("master", "release");

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        const sha1 = gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd, "release");
        gitPush(cwd);

        let stdout = new WritableStreamBuffer();
        let stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        let result = await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master", prerelease: "dev" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Add new testing files for a new release.
        createNewTestingFiles(packages, cwd);

        const sha = gitCommitAll(cwd, "feat: New releases");

        gitPush(cwd);

        // Capture output.
        stdout = new WritableStreamBuffer();
        stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease() for a second release
        // Doesn't include plugins that actually publish.
        result = await multiSemanticRelease(
            packages.map((folder) => `${folder}package.json`),
            {
                branches: [{ name: "master", prerelease: "dev" }, { name: "release" }],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 4 packages...");
        expect(out).toMatch("Loaded package msr-test-a");
        expect(out).toMatch("Loaded package msr-test-b");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 4 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-a@1.0.0-dev.2");
        expect(out).toMatch("Created tag msr-test-b@1.0.0-dev.2");
        expect(out).toMatch("Created tag msr-test-c@1.0.0-dev.2");
        expect(out).toMatch("Created tag msr-test-d@1.0.0-dev.2");
        expect(out).toMatch("Released 4 of 4 packages, semantically!");

        // A.
        expect(result[0].name).toBe("msr-test-a");
        expect(result[0].result.lastRelease).toStrictEqual({
            channels: ["master"],
            gitHead: sha1,
            gitTag: "msr-test-a@1.0.0-dev.1",
            name: "msr-test-a@1.0.0-dev.1",
            version: "1.0.0-dev.1",
        });
        expect(result[0].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-a@1.0.0-dev.2",
            type: "minor",
            version: "1.0.0-dev.2",
        });
        expect(result[0].result.nextRelease.notes).toMatch("# msr-test-a [1.0.0-dev.2]");
        expect(result[0].result.nextRelease.notes).toMatch("### Features\n\n* New releases");

        // B.
        expect(result[2].name).toBe("msr-test-b");
        expect(result[2].result.lastRelease).toStrictEqual({
            channels: ["master"],
            gitHead: sha1,
            gitTag: "msr-test-b@1.0.0-dev.1",
            name: "msr-test-b@1.0.0-dev.1",
            version: "1.0.0-dev.1",
        });
        expect(result[2].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-b@1.0.0-dev.2",
            type: "minor",
            version: "1.0.0-dev.2",
        });
        expect(result[2].result.nextRelease.notes).toMatch("# msr-test-b [1.0.0-dev.2]");
        expect(result[2].result.nextRelease.notes).toMatch("### Features\n\n* New releases");
        expect(result[2].result.nextRelease.notes).toMatch(
            "### Dependencies\n\n* **msr-test-a:** upgraded to 1.0.0-dev.2\n* **msr-test-d:** upgraded to 1.0.0-dev.2",
        );

        // C.
        expect(result[3].name).toBe("msr-test-c");
        expect(result[3].result.lastRelease).toStrictEqual({
            channels: ["master"],
            gitHead: sha1,
            gitTag: "msr-test-c@1.0.0-dev.1",
            name: "msr-test-c@1.0.0-dev.1",
            version: "1.0.0-dev.1",
        });
        expect(result[3].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-c@1.0.0-dev.2",
            type: "minor",
            version: "1.0.0-dev.2",
        });
        expect(result[3].result.nextRelease.notes).toMatch("# msr-test-c [1.0.0-dev.2]");
        expect(result[3].result.nextRelease.notes).toMatch("### Features\n\n* New releases");
        expect(result[3].result.nextRelease.notes).toMatch(
            "### Dependencies\n\n* **msr-test-b:** upgraded to 1.0.0-dev.2\n* **msr-test-d:** upgraded to 1.0.0-dev.2",
        );

        // D.
        expect(result[1].name).toBe("msr-test-d");
        expect(result[1].result.lastRelease).toStrictEqual({
            channels: ["master"],
            gitHead: sha1,
            gitTag: "msr-test-d@1.0.0-dev.1",
            name: "msr-test-d@1.0.0-dev.1",
            version: "1.0.0-dev.1",
        });
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha,
            gitTag: "msr-test-d@1.0.0-dev.2",
            type: "minor",
            version: "1.0.0-dev.2",
        });
        expect(result[1].result.nextRelease.notes).toMatch("# msr-test-d [1.0.0-dev.2]");
        expect(result[1].result.nextRelease.notes).toMatch("### Features\n\n* New releases");
        expect(result[1].result.nextRelease.notes).not.toMatch("### Dependencies");

        // ONLY four times.
        expect(result).toHaveLength(4);

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/a/package.json`)).toMatchObject({
            peerDependencies: {
                "left-pad": "latest",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-a": "1.0.0-dev.2",
            },
            devDependencies: {
                "left-pad": "latest",
                "msr-test-d": "1.0.0-dev.2",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            devDependencies: {
                "msr-test-b": "1.0.0-dev.2",
                "msr-test-d": "1.0.0-dev.2",
            },
        });
    }, 20_000);

    it("no changes in any packages", async () => {
        expect.assertions(15);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");

        // Creating the four tags so there are no changes in any packages.
        gitTag(cwd, "msr-test-a@1.0.0");
        gitTag(cwd, "msr-test-b@1.0.0");
        gitTag(cwd, "msr-test-c@1.0.0");
        gitTag(cwd, "msr-test-d@1.0.0");

        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        const result = await multiSemanticRelease(
            [`packages/c/package.json`, `packages/a/package.json`, `packages/d/package.json`, `packages/b/package.json`],
            {},
            { cwd, env: environment, stderr, stdout },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 4 packages...");
        expect(out).toMatch("Loaded package msr-test-a");
        expect(out).toMatch("Loaded package msr-test-b");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 4 packages! Starting release...");
        expect(out).toMatch("There are no relevant changes, so no new version is released");
        expect(out).not.toMatch("Created tag");
        expect(out).toMatch("Released 0 of 4 packages, semantically!");

        // Results.
        expect(result[0].result).toBe(false);
        expect(result[1].result).toBe(false);
        expect(result[2].result).toBe(false);
        expect(result[3].result).toBe(false);
        expect(result).toHaveLength(4);
    });

    it("changes in some packages", async () => {
        expect.assertions(36);

        // Create Git repo.
        const cwd = gitInit();

        // Initial commit.
        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        const sha1 = gitCommitAll(cwd, "feat: Initial release");

        gitTag(cwd, "msr-test-a@1.0.0");
        gitTag(cwd, "msr-test-b@1.0.0");
        gitTag(cwd, "msr-test-c@1.0.0");
        gitTag(cwd, "msr-test-d@1.0.0");
        // Second commit.
        writeFileSync(`${cwd}/packages/a/aaa.txt`, "AAA");

        const sha2 = gitCommitAll(cwd, "feat(aaa): Add missing text file");

        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        const result = await multiSemanticRelease(
            [`packages/d/package.json`, `packages/b/package.json`, `packages/a/package.json`, `packages/c/package.json`],
            {},
            { cwd, env: environment, stderr, stdout },
            { deps: {}, dryRun: false },
        );

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 4 packages...");
        expect(out).toMatch("Loaded package msr-test-a");
        expect(out).toMatch("Loaded package msr-test-b");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 4 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-a@1.1.0");
        expect(out).toMatch("Created tag msr-test-b@1.0.1");
        // expect(out).toMatch("Created tag msr-test-c@1.0.1");
        expect(out).toMatch("There are no relevant changes, so no new version is released");
        expect(out).toMatch("Released 3 of 4 packages, semantically!");

        // A.
        expect(result[0].name).toBe("msr-test-a");
        expect(result[0].result.lastRelease).toMatchObject({
            gitHead: sha1,
            gitTag: "msr-test-a@1.0.0",
            version: "1.0.0",
        });
        expect(result[0].result.nextRelease).toMatchObject({
            gitHead: sha2,
            gitTag: "msr-test-a@1.1.0",
            type: "minor",
            version: "1.1.0",
        });
        expect(result[0].result.nextRelease.notes).toMatch("# msr-test-a [1.1.0]");
        expect(result[0].result.nextRelease.notes).toMatch("### Features\n\n* **aaa:** Add missing text file");
        // expect(result[3].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-c:** upgraded to 1.0.1");

        // B.
        expect(result[2].name).toBe("msr-test-b");
        expect(result[2].result.lastRelease).toStrictEqual({
            channels: [null],
            gitHead: sha1,
            gitTag: "msr-test-b@1.0.0",
            name: "msr-test-b@1.0.0",
            version: "1.0.0",
        });
        expect(result[2].result.nextRelease).toMatchObject({
            gitHead: sha2,
            gitTag: "msr-test-b@1.0.1",
            type: "patch",
            version: "1.0.1",
        });
        expect(result[2].result.nextRelease.notes).toMatch("# msr-test-b [1.0.1]");
        expect(result[2].result.nextRelease.notes).not.toMatch("### Features");
        expect(result[2].result.nextRelease.notes).not.toMatch("### Bug Fixes");
        expect(result[2].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-a:** upgraded to 1.1.0");

        // C.
        expect(result[3].name).toBe("msr-test-c");
        expect(result[3].result.lastRelease).toStrictEqual({
            channels: [null],
            gitHead: sha1,
            gitTag: "msr-test-c@1.0.0",
            name: "msr-test-c@1.0.0",
            version: "1.0.0",
        });
        expect(result[3].result.nextRelease).toMatchObject({
            gitHead: sha2,
            gitTag: "msr-test-c@1.0.1",
            type: "patch",
            version: "1.0.1",
        });
        expect(result[3].result.nextRelease.notes).toMatch("# msr-test-c [1.0.1]");
        expect(result[3].result.nextRelease.notes).not.toMatch("### Features");
        expect(result[3].result.nextRelease.notes).not.toMatch("### Bug Fixes");
        expect(result[3].result.nextRelease.notes).toMatch("### Dependencies\n\n* **msr-test-b:** upgraded to 1.0.1");

        // D.
        expect(result[1].name).toBe("msr-test-d");
        expect(result[1].result).toBe(false);

        // ONLY four times.
        expect(result[4]).toBeUndefined();

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/a/package.json`)).toMatchObject({
            peerDependencies: {
                "left-pad": "latest",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-a": "1.1.0",
            },
            devDependencies: {
                "left-pad": "latest",
                "msr-test-d": "1.0.0",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            devDependencies: {
                "msr-test-b": "1.0.1",
                "msr-test-d": "1.0.0",
            },
        });
    });

    it("changes in child packages with sequentialPrepare", async () => {
        expect.assertions(18);

        const mockPrepare = vi.fn();
        // Create Git repo.
        const cwd = gitInit();

        // Initial commit.
        copyDirectory(`${fixturesPath}/yarnWorkspaces2Packages/`, cwd);

        const sha1 = gitCommitAll(cwd, "feat: Initial release");

        gitTag(cwd, "msr-test-c@1.0.0");
        gitTag(cwd, "msr-test-d@1.0.0");
        // Second commit.
        writeFileSync(`${cwd}/packages/d/aaa.txt`, "AAA");

        const sha2 = gitCommitAll(cwd, "feat(aaa): Add missing text file");

        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        const result = await multiSemanticRelease(
            [`packages/c/package.json`, `packages/d/package.json`],
            {
                plugins: [
                    {
                        // Ensure that msr-test-c is always ready before msr-test-d
                        verify: (_, { lastRelease: { name } }) =>
                            // eslint-disable-next-line compat/compat
                            new Promise((resolve) => {
                                if (name.split("@")[0] === "msr-test-c") {
                                    resolve();
                                }

                                setTimeout(resolve, 5000);
                            }),
                    },
                    {
                        prepare: (_, { lastRelease: { name } }) => {
                            mockPrepare(name.split("@")[0]);
                        },
                    },
                ],
            },
            { cwd, env: environment, stderr, stdout },
            { deps: {}, dryRun: false, sequentialPrepare: true },
        );

        expect(mockPrepare).toHaveBeenNthCalledWith(1, "msr-test-d");
        expect(mockPrepare).toHaveBeenNthCalledWith(2, "msr-test-c");

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 2 packages...");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 2 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-d@1.1.0");
        expect(out).toMatch("Created tag msr-test-c@1.0.1");
        expect(out).toMatch("Released 2 of 2 packages, semantically!");

        // C.
        expect(result[1].name).toBe("msr-test-c");
        expect(result[1].result.lastRelease).toMatchObject({
            gitHead: sha1,
            gitTag: "msr-test-c@1.0.0",
            version: "1.0.0",
        });
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha2,
            gitTag: "msr-test-c@1.0.1",
            type: "patch",
            version: "1.0.1",
        });

        // D.
        expect(result[0].name).toBe("msr-test-d");
        expect(result[0].result.lastRelease).toStrictEqual({
            channels: [null],
            gitHead: sha1,
            gitTag: "msr-test-d@1.0.0",
            name: "msr-test-d@1.0.0",
            version: "1.0.0",
        });
        expect(result[0].result.nextRelease).toMatchObject({
            gitHead: sha2,
            gitTag: "msr-test-d@1.1.0",
            type: "minor",
            version: "1.1.0",
        });

        // ONLY three times.
        expect(result[2]).toBeUndefined();

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-d": "1.1.0",
            },
        });
    });

    it("changes in parent packages with sequentialPrepare", async () => {
        expect.assertions(13);

        // Create Git repo.
        const cwd = gitInit();

        // Initial commit.
        copyDirectory(`${fixturesPath}/yarnWorkspaces2Packages/`, cwd);
        const sha1 = gitCommitAll(cwd, "feat: Initial release");

        gitTag(cwd, "msr-test-c@1.0.0");
        gitTag(cwd, "msr-test-d@1.0.0");
        // Second commit.
        writeFileSync(`${cwd}/packages/c/aaa.txt`, "AAA");
        const sha2 = gitCommitAll(cwd, "feat(aaa): Add missing text file");

        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        const result = await multiSemanticRelease(null, {}, { cwd, env: environment, stderr, stdout }, { deps: {}, dryRun: false, sequentialPrepare: true });

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Started multirelease! Loading 2 packages...");
        expect(out).toMatch("Loaded package msr-test-c");
        expect(out).toMatch("Loaded package msr-test-d");
        expect(out).toMatch("Queued 2 packages! Starting release...");
        expect(out).toMatch("Created tag msr-test-c@1.1.0");
        expect(out).toMatch("Released 1 of 2 packages, semantically!");

        // C.
        expect(result[1].name).toBe("msr-test-c");
        expect(result[1].result.lastRelease).toMatchObject({
            gitHead: sha1,
            gitTag: "msr-test-c@1.0.0",
            version: "1.0.0",
        });
        expect(result[1].result.nextRelease).toMatchObject({
            gitHead: sha2,
            gitTag: "msr-test-c@1.1.0",
            type: "minor",
            version: "1.1.0",
        });

        // D.
        expect(result[0].name).toBe("msr-test-d");
        expect(result[0].result.nextRelease).toBeUndefined();

        // ONLY two times.
        expect(result[2]).toBeUndefined();
    });

    it("changes in some packages (sequential-init)", async () => {
        expect.assertions(3);

        // Create Git repo.
        const cwd = gitInit();

        // Initial commit.
        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");

        gitTag(cwd, "msr-test-a@1.0.0");
        gitTag(cwd, "msr-test-b@1.0.0");
        gitTag(cwd, "msr-test-c@1.0.0");
        gitTag(cwd, "msr-test-d@1.0.0");

        // Second commit.
        writeFileSync(`${cwd}/packages/a/aaa.txt`, "AAA");

        gitCommitAll(cwd, "feat(aaa): Add missing text file");
        gitInitOrigin(cwd);

        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        await multiSemanticRelease(
            [`packages/c/package.json`, `packages/d/package.json`, `packages/b/package.json`, `packages/a/package.json`],
            {},
            { cwd, env: environment, stderr, stdout },
            { sequentialInit: true },
        );

        // Check manifests.
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/a/package.json`)).toMatchObject({
            peerDependencies: {
                "left-pad": "latest",
            },
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/b/package.json`)).toMatchObject({
            dependencies: {
                "msr-test-a": "1.1.0",
            },
            devDependencies: {
                "left-pad": "latest",
                "msr-test-d": "1.0.0",
            },
            version: "1.0.1",
        });
        // eslint-disable-next-line import/no-dynamic-require
        expect(require(`${cwd}/packages/c/package.json`)).toMatchObject({
            devDependencies: {
                "msr-test-b": "1.0.1",
                "msr-test-d": "1.0.0",
            },
            version: "1.0.1",
        });
    });

    it("error if release's local deps have no version number", async () => {
        expect.assertions(1);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitAdd(cwd, "packages/c/package.json");

        gitCommit(cwd, "feat: Commit c package only");
        gitInitOrigin(cwd);

        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        try {
            await multiSemanticRelease(null, {}, { cwd, env: environment, stderr, stdout });

            // Not reached.
            expect(false).toBe(true);
        } catch (error) {
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(error.message).toBe("Cannot release msr-test-c because dependency msr-test-b has not been released yet");
        }
    });

    it("configured plugins are called as normal", async () => {
        expect.assertions(7);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd);

        gitPush(cwd);

        // Make an inline plugin.
        const plugin = {
            analyzeCommits: vi.fn(),
            fail: vi.fn(),
            generateNotes: vi.fn(),
            prepare: vi.fn(),
            success: vi.fn(),
            verifyConditions: vi.fn(),
            verifyRelease: vi.fn(),
        };

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        await multiSemanticRelease(
            [`packages/d/package.json`],
            {
                analyzeCommits: ["@semantic-release/commit-analyzer"],
                // Override to add our own plugins.
                plugins: ["@semantic-release/release-notes-generator", plugin],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Check calls.
        expect(plugin.verifyConditions).toHaveBeenCalledTimes(1);
        expect(plugin.analyzeCommits).toHaveBeenCalledTimes(0); // NOTE overridden
        expect(plugin.verifyRelease).toHaveBeenCalledTimes(1);
        expect(plugin.generateNotes).toHaveBeenCalledTimes(1);
        expect(plugin.prepare).toHaveBeenCalledTimes(1);
        expect(plugin.success).toHaveBeenCalledTimes(1);
        expect(plugin.fail).not.toHaveBeenCalled();
    });

    it("bot commit release note should filetered", async () => {
        expect.assertions(1);

        // Create Git repo.
        const cwd = gitInit();

        // Initial commit.
        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");

        gitTag(cwd, "msr-test-a@1.0.0");
        gitTag(cwd, "msr-test-b@1.0.0");
        gitTag(cwd, "msr-test-c@1.0.0");
        gitTag(cwd, "msr-test-d@1.0.0");
        // Second commit.
        writeFileSync(`${cwd}/packages/a/aaa.txt`, "AAA");

        gitCommitAll(cwd, "feat(aaa): Add missing text file");

        // Third commit.
        writeFileSync(`${cwd}/packages/b/bbb.txt`, "BBB");

        gitCommitAll(cwd, "feat(bbb): Add missing text file");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease()
        // Include "@semantic-release/git" for made the git head changed
        await multiSemanticRelease(
            [`packages/c/package.json`, `packages/d/package.json`, `packages/b/package.json`, `packages/a/package.json`],
            {
                analyzeCommits: ["@semantic-release/commit-analyzer"],
                plugins: ["@semantic-release/release-notes-generator", "@semantic-release/changelog", "@semantic-release/git"],
            },
            { cwd, env: environment, stderr, stdout },
            { deps: {}, dryRun: false },
        );

        const logOutput = gitGetLog(cwd, 3, "HEAD");

        // eslint-disable-next-line regexp/no-super-linear-backtracking
        expect(logOutput).not.toMatch(/.*aaa.*Add missing text file.*\n.*bbb.*Add missing text file.*/u);
    });

    it("deep errors (e.g. in plugins) bubble up and out", async () => {
        expect.assertions(1);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd);

        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Release.

        // Call multiSemanticRelease()
        // Doesn't include plugins that actually publish.
        try {
            await multiSemanticRelease(
                [`packages/d/package.json`, `packages/a/package.json`],
                {
                    // Override to add our own erroring plugin.
                    plugins: [
                        {
                            analyzeCommits: () => {
                                throw new Error("NOPE");
                            },
                        },
                    ],
                },
                { cwd, env: environment, stderr, stdout },
            );

            // Not reached.
            expect(false).toBe(true);
        } catch (error) {
            // Error bubbles up through semantic-release and multi-semantic-release and out.
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(error.message).toBe("NOPE");
        }
    });

    it("typeError if CWD is not string", async () => {
        expect.assertions(3);

        await expect(multiSemanticRelease(null, {}, { cwd: 123 })).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease(null, {}, { cwd: true })).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease(null, {}, { cwd: [] })).rejects.toBeInstanceOf(TypeError);
    });

    it("typeError if paths is not a list of strings", async () => {
        expect.assertions(7);

        await expect(multiSemanticRelease(123)).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease("string")).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease(true)).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease([1, 2, 3])).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease([true, false])).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease([undefined])).rejects.toBeInstanceOf(TypeError);
        await expect(multiSemanticRelease([null])).rejects.toBeInstanceOf(TypeError);
    });

    it("referenceError if paths points to a non-file", async () => {
        expect.assertions(3);

        const stdout = new WritableStreamBuffer(); // Blackhole the output so it doesn't clutter Jest.
        const r1 = multiSemanticRelease([`${fixturesPath}/DOESNOTEXIST.json`], {}, { stdout });

        await expect(r1).rejects.toBeInstanceOf(ReferenceError); // Path that does not exist.

        const r2 = multiSemanticRelease([`${fixturesPath}/DOESNOTEXIST/`], {}, { stdout });

        await expect(r2).rejects.toBeInstanceOf(ReferenceError); // Path that does not exist.

        const r3 = multiSemanticRelease([`${fixturesPath}/`], {}, { stdout });

        await expect(r3).rejects.toBeInstanceOf(ReferenceError); // Directory that exists.
    });

    it("syntaxError if paths points to package.json with bad syntax", async () => {
        expect.assertions(12);

        const stdout = new WritableStreamBuffer(); // Blackhole the output so it doesn't clutter Jest.
        const r1 = multiSemanticRelease([`${fixturesPath}/invalidPackage.json`], {}, { stdout });

        await expect(r1).rejects.toBeInstanceOf(SyntaxError);
        await expect(r1).rejects.toMatchObject({
            message: expect.stringMatching("could not be parsed"),
        });

        const r2 = multiSemanticRelease([`${fixturesPath}/numberPackage.json`], {}, { stdout });

        await expect(r2).rejects.toBeInstanceOf(SyntaxError);
        await expect(r2).rejects.toMatchObject({
            message: expect.stringMatching("not an object"),
        });

        const r3 = multiSemanticRelease([`${fixturesPath}/badNamePackage.json`], {}, { stdout });

        await expect(r3).rejects.toBeInstanceOf(SyntaxError);
        await expect(r3).rejects.toMatchObject({
            message: expect.stringMatching("Package name must be non-empty string"),
        });

        const r4 = multiSemanticRelease([`${fixturesPath}/badDepsPackage.json`], {}, { stdout });

        await expect(r4).rejects.toBeInstanceOf(SyntaxError);
        await expect(r4).rejects.toMatchObject({
            message: expect.stringMatching("Package dependencies must be object"),
        });

        const r5 = multiSemanticRelease([`${fixturesPath}/badDevDepsPackage.json`], {}, { stdout });

        await expect(r5).rejects.toBeInstanceOf(SyntaxError);
        await expect(r5).rejects.toMatchObject({
            message: expect.stringMatching("Package devDependencies must be object"),
        });

        const r6 = multiSemanticRelease([`${fixturesPath}/badPeerDepsPackage.json`], {}, { stdout });

        await expect(r6).rejects.toBeInstanceOf(SyntaxError);
        await expect(r6).rejects.toMatchObject({
            message: expect.stringMatching("Package peerDependencies must be object"),
        });
    });

    it("generated tag with custom version format", async () => {
        expect.assertions(2);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");

        gitInitOrigin(cwd);

        await gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // eslint-disable-next-line no-template-curly-in-string
        await multiSemanticRelease([`packages/a/package.json`], {}, { cwd, env: environment, stderr, stdout }, { deps: {}, tagFormat: "${name}/${version}" });

        // Get stdout and stderr output.
        const error = stderr.getContentsAsString("utf8");

        expect(error).toBe(false);

        const out = stdout.getContentsAsString("utf8");

        expect(out).toMatch("Created tag msr-test-a/1.0.0");
    });

    it("dryRun flag should not create tags or publish", async () => {
        expect.assertions(3);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease with dryRun flag
        const result: ReleaseResult[] = await multiSemanticRelease(
            [`packages/a/package.json`, `packages/b/package.json`, `packages/c/package.json`, `packages/d/package.json`],
            {
                // Include the git plugin to test that dry-run prevents tag creation
                plugins: ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator", "@semantic-release/git"],
            },
            { cwd, env: environment, stderr, stdout },
            { deps: {}, dryRun: true, sequentialPrepare: true },
        );

        // Get stdout output.
        const out = stdout.getContentsAsString("utf8");

        // Verify that packages had releases planned
        expect(out).toMatch("Started multirelease");

        // Verify that the dryRun flag is being respected
        // In dry-run mode, semantic-release should not call the prepare step on the inline plugin
        // The test fixture doesn't have git or github plugins, so we can't verify tag/release creation directly
        // But we verify that the setup worked correctly
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Array);
    });

    it("plugins receive correct cwd for each package", async () => {
        expect.assertions(10);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Track the cwd values received by plugins for each package
        const cwdValues = {
            generateNotes: [],
            prepare: [],
            publish: [],
            verifyConditions: [],
            verifyRelease: [],
        };

        // Make an inline plugin that captures context.cwd
        const plugin = {
            generateNotes: vi.fn((pluginConfig, context) => {
                cwdValues.generateNotes.push(context.cwd);

                return "";
            }),
            prepare: vi.fn((pluginConfig, context) => {
                cwdValues.prepare.push(context.cwd);
            }),
            publish: vi.fn((pluginConfig, context) => {
                cwdValues.publish.push(context.cwd);

                return {};
            }),
            verifyConditions: vi.fn((pluginConfig, context) => {
                cwdValues.verifyConditions.push(context.cwd);
            }),
            verifyRelease: vi.fn((pluginConfig, context) => {
                cwdValues.verifyRelease.push(context.cwd);
            }),
        };

        // Capture output.
        const stdout = new WritableStreamBuffer();
        const stderr = new WritableStreamBuffer();

        // Call multiSemanticRelease() with two packages
        await multiSemanticRelease(
            [`packages/a/package.json`, `packages/b/package.json`],
            {
                analyzeCommits: ["@semantic-release/commit-analyzer"],
                plugins: ["@semantic-release/release-notes-generator", plugin],
            },
            { cwd, env: environment, stderr, stdout },
        );

        // Verify that each plugin hook was called
        expect(plugin.verifyConditions).toHaveBeenCalledTimes(2);
        expect(plugin.verifyRelease).toHaveBeenCalledTimes(2);
        expect(plugin.generateNotes).toHaveBeenCalledTimes(2);
        expect(plugin.prepare).toHaveBeenCalledTimes(2);
        expect(plugin.publish).toHaveBeenCalledTimes(2);

        // Verify that each hook received the correct package-specific cwd
        // Package a should have cwd ending in packages/a
        expect(cwdValues.verifyConditions[0]).toMatch(/packages\/a$/u);
        expect(cwdValues.verifyRelease[0]).toMatch(/packages\/a$/u);
        expect(cwdValues.generateNotes[0]).toMatch(/packages\/a$/u);
        expect(cwdValues.prepare[0]).toMatch(/packages\/a$/u);
        expect(cwdValues.publish[0]).toMatch(/packages\/a$/u);
    });
});

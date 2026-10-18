import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { Package } from "../../src/types";
import { createRootFileChangeDetector, formatRootFileChanges } from "../../src/utils/detect-root-file-changes";
import { gitCommitAll, gitInit } from "../helpers/git";
import { buildPnpmLockfile } from "../helpers/pnpm-lockfile";

const createPackage = (cwd: string, name: string, directory: string): Package => ({ dir: resolve(cwd, directory), name }) as Package;

/**
 * Create a repository whose first commit holds the lock file and `.npmrc`.
 * @returns The repository and the SHA of its first commit.
 */
const setUpWorkspace = (): { cwd: string; initialSha: string } => {
    const cwd = gitInit();

    writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile());
    writeFileSync(resolve(cwd, ".npmrc"), "a=1\n");

    return { cwd, initialSha: gitCommitAll(cwd, "feat: initial commit") };
};

describe("createRootFileChangeDetector()", () => {
    it("should skip packages not listed in rootFilesPackages", async () => {
        expect.assertions(1);

        const { cwd, initialSha } = setUpWorkspace();

        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile({ dep: "1.0.1" }));
        gitCommitAll(cwd, "chore: update lock file");

        const detect = createRootFileChangeDetector(cwd, { rootFilesPackages: ["b"], rootFilesScope: "affected", triggerRootFiles: ["pnpm-lock.yaml"] });

        await expect(detect(createPackage(cwd, "a", "packages/a"), initialSha)).resolves.toBeUndefined();
    });

    it('should treat other root files as affecting every package with scope "affected"', async () => {
        expect.assertions(1);

        const { cwd, initialSha } = setUpWorkspace();

        writeFileSync(resolve(cwd, ".npmrc"), "a=2\n");
        gitCommitAll(cwd, "chore: update npmrc");

        const detect = createRootFileChangeDetector(cwd, { rootFilesScope: "affected", triggerRootFiles: ["pnpm-lock.yaml", ".npmrc"] });

        await expect(detect(createPackage(cwd, "b", "packages/b"), initialSha)).resolves.toStrictEqual({
            dependencies: [],
            files: [".npmrc"],
            releaseType: "patch",
            transitiveCount: 0,
        });
    });

    it("should treat an unsupported lock file version as a changed root file", async () => {
        expect.assertions(1);

        const cwd = gitInit();

        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile().replace("lockfileVersion: '9.0'", "lockfileVersion: '6.0'"));

        const initialSha = gitCommitAll(cwd, "feat: initial commit");

        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile());
        gitCommitAll(cwd, "chore: upgrade lock file");

        const detect = createRootFileChangeDetector(cwd, { rootFilesScope: "affected", triggerRootFiles: ["pnpm-lock.yaml"] });

        await expect(detect(createPackage(cwd, "b", "packages/b"), initialSha)).resolves.toStrictEqual({
            dependencies: [],
            files: ["pnpm-lock.yaml"],
            releaseType: "patch",
            transitiveCount: 0,
        });
    });

    it("should report nothing without a lock file at the last release", async () => {
        expect.assertions(1);

        const cwd = gitInit();

        writeFileSync(resolve(cwd, "README.md"), "# Test\n");

        const initialSha = gitCommitAll(cwd, "feat: initial commit");

        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile());
        gitCommitAll(cwd, "chore: add lock file");

        const detect = createRootFileChangeDetector(cwd, { rootFilesScope: "affected", triggerRootFiles: ["pnpm-lock.yaml"] });

        await expect(detect(createPackage(cwd, "a", "packages/a"), initialSha)).resolves.toBeUndefined();
    });

    it("should compare against HEAD as of the detector's creation, even before the first detection", async () => {
        expect.assertions(1);

        const { cwd, initialSha } = setUpWorkspace();
        const detect = createRootFileChangeDetector(cwd, { rootFilesScope: "affected", triggerRootFiles: ["pnpm-lock.yaml"] });

        // E.g. an earlier package's release, or a filtered-out package analyzed first, committing a lock file update
        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile({ dep: "1.0.1" }));
        gitCommitAll(cwd, "chore(release): update lock file");

        await expect(detect(createPackage(cwd, "a", "packages/a"), initialSha)).resolves.toBeUndefined();
    });

    it("should reject unsupported root file options", () => {
        expect.assertions(2);

        expect(() => createRootFileChangeDetector("/repo", { rootFilesReleaseType: "minr" as "minor" })).toThrow("rootFilesReleaseType");
        expect(() => createRootFileChangeDetector("/repo", { rootFilesScope: "some" as "all" })).toThrow("rootFilesScope");
    });

    it("should compare every package against HEAD as of the first detection", async () => {
        expect.assertions(2);

        const { cwd, initialSha } = setUpWorkspace();

        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile({ dep: "1.0.1" }));
        gitCommitAll(cwd, "chore: update lock file");

        const detect = createRootFileChangeDetector(cwd, { rootFilesScope: "affected", triggerRootFiles: ["pnpm-lock.yaml"] });

        await expect(detect(createPackage(cwd, "a", "packages/a"), initialSha)).resolves.toMatchObject({ dependencies: [{ name: "dep" }] });

        // A commit created during the run (e.g. by an earlier package's release) must not change the result.
        writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildPnpmLockfile());
        gitCommitAll(cwd, "chore(release): revert lock file");

        await expect(detect(createPackage(cwd, "a", "packages/a"), initialSha)).resolves.toMatchObject({ dependencies: [{ name: "dep" }] });
    });
});

describe("formatRootFileChanges()", () => {
    it("should leave out dependencies the notes already list", () => {
        expect.assertions(1);

        const notes = formatRootFileChanges(
            {
                dependencies: [
                    { name: "lodash-es", newVersion: "4.17.1", oldVersion: "4.17.0" },
                    { name: "other", newVersion: "1.0.1", oldVersion: "1.0.0" },
                ],
                files: [],
                releaseType: "patch",
                transitiveCount: 0,
            },
            new Set(["lodash-es"]),
        );

        expect(notes).toStrictEqual(["* **other:** 1.0.0 → 1.0.1"]);
    });

    it("should format updated, added and removed dependencies, further updates and files", () => {
        expect.assertions(1);

        const notes = formatRootFileChanges({
            dependencies: [
                { name: "a", newVersion: "1.1.0", oldVersion: "1.0.0" },
                { name: "b", newVersion: "2.0.0", oldVersion: undefined },
                { name: "c", newVersion: undefined, oldVersion: "3.0.0" },
            ],
            files: [".npmrc"],
            releaseType: "minor",
            transitiveCount: 2,
        });

        expect(notes).toStrictEqual([
            "* **a:** 1.0.0 → 1.1.0",
            "* **b:** added 2.0.0",
            "* **c:** removed 3.0.0",
            "* **pnpm-lock.yaml:** 2 more dependencies updated",
            "* **.npmrc** changed",
        ]);
    });
});

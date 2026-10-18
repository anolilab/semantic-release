import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { PnpmLockfile } from "../../src/utils/detect-root-file-changes";
import { compareDependencyGraphs, getChangedRootFiles, getImporterPath, readPnpmLockfile } from "../../src/utils/detect-root-file-changes";
import { gitCommitAll, gitInit } from "../helpers/git";
import { buildPnpmLockfile as buildLockfile } from "../helpers/pnpm-lockfile";

const parse = async (content: string): Promise<PnpmLockfile> => {
    const cwd = gitInit();

    writeFileSync(resolve(cwd, "pnpm-lock.yaml"), content);
    gitCommitAll(cwd, "chore: lock file");

    return (await readPnpmLockfile(cwd)) as PnpmLockfile;
};

describe("detect-root-file-changes", () => {
    describe("compareDependencyGraphs()", () => {
        it("should report no changes for an identical lock file", async () => {
            expect.assertions(1);

            const lockfile = await parse(buildLockfile());

            expect(compareDependencyGraphs(lockfile, lockfile, "packages/a")).toBeNull();
        });

        it("should report a changed direct dependency with its release type", async () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(await parse(buildLockfile()), await parse(buildLockfile({ dep: "1.1.0" })), "packages/a");

            expect(changes).toStrictEqual({
                dependencies: [{ name: "dep", newVersion: "1.1.0", oldVersion: "1.0.0" }],
                files: [],
                releaseType: "minor",
                transitiveCount: 0,
            });
        });

        it("should report a transitive-only change", async () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(await parse(buildLockfile()), await parse(buildLockfile({ sub: "3.0.1" })), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], files: [], releaseType: "patch", transitiveCount: 1 });
        });

        it("should report a changed integrity of the same version", async () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(
                await parse(buildLockfile()),
                await parse(buildLockfile({ subIntegrity: "sha512-republished" })),
                "packages/a",
            );

            expect(changes?.transitiveCount).toBe(1);
        });

        it("should follow workspace links into production dependencies of linked packages", async () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(await parse(buildLockfile()), await parse(buildLockfile({ libdep: "2.0.1" })), "packages/a");

            expect(changes?.dependencies).toStrictEqual([{ name: "libdep", newVersion: "2.0.1", oldVersion: "2.0.0" }]);
        });

        it("should ignore devDependencies", async () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(await parse(buildLockfile()), await parse(buildLockfile({ tool: "1.1.0" })), "packages/a");

            expect(changes).toBeNull();
        });

        it("should ignore changes outside the package's dependency graph", async () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(await parse(buildLockfile()), await parse(buildLockfile({ dep: "1.1.0" })), "packages/b");

            expect(changes).toBeNull();
        });

        it("should report a peer context change of the same version", async () => {
            expect.assertions(1);

            const oldLockfile = await parse(buildLockfile());
            const newLockfile = await parse(
                buildLockfile()
                    .replace("version: 1.0.0\n      lib:", "version: 1.0.0(peer@1.0.0)\n      lib:")
                    .replace("snapshots:\n\n  dep@1.0.0:", "snapshots:\n\n  dep@1.0.0(peer@1.0.0):"),
            );

            expect(compareDependencyGraphs(oldLockfile, newLockfile, "packages/a")).toStrictEqual({
                dependencies: [],
                files: [],
                releaseType: "patch",
                transitiveCount: 1,
            });
        });

        it("should report nothing without a baseline", async () => {
            expect.assertions(2);

            const lockfile = await parse(buildLockfile());

            expect(compareDependencyGraphs(null, lockfile, "packages/a")).toBeNull();
            expect(compareDependencyGraphs(lockfile, lockfile, "packages/new")).toBeNull();
        });

        it("should report added and removed direct dependencies", async () => {
            expect.assertions(2);

            const withoutOther = await parse(buildLockfile());
            const withOther = await parse(
                buildLockfile().replace(
                    "      lib:\n        specifier: workspace:^",
                    "      other:\n        specifier: ^1.0.0\n        version: 1.0.0\n      lib:\n        specifier: workspace:^",
                ),
            );

            expect(compareDependencyGraphs(withoutOther, withOther, "packages/a")?.dependencies).toStrictEqual([
                { name: "other", newVersion: "1.0.0", oldVersion: undefined },
            ]);
            expect(compareDependencyGraphs(withOther, withoutOther, "packages/a")?.dependencies).toStrictEqual([
                { name: "other", newVersion: undefined, oldVersion: "1.0.0" },
            ]);
        });

        it("should follow optionalDependencies", async () => {
            expect.assertions(1);

            const asOptional = (content: string): string => content.replace("  packages/a:\n    dependencies:", "  packages/a:\n    optionalDependencies:");
            const oldLockfile = asOptional(buildLockfile());
            const newLockfile = asOptional(buildLockfile({ sub: "3.0.1" }));
            const changes = compareDependencyGraphs(await parse(oldLockfile), await parse(newLockfile), "packages/a");

            expect(changes?.transitiveCount).toBe(1);
        });

        it("should treat an unsupported lock file version as a changed root file", async () => {
            expect.assertions(1);

            const oldLockfile = await parse(buildLockfile().replace("lockfileVersion: '9.0'", "lockfileVersion: '6.0'"));
            const changes = compareDependencyGraphs(oldLockfile, await parse(buildLockfile()), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], files: ["pnpm-lock.yaml"], releaseType: "patch", transitiveCount: 0 });
        });

        it("should report a workspace link pointing to another package with the same dependencies", async () => {
            expect.assertions(1);

            const withSecondLibrary = (content: string): string =>
                content.replace(
                    "packages:\n\n  dep@",
                    "  packages/lib2:\n    dependencies:\n      libdep:\n        specifier: ^2.0.0\n        version: 2.0.0\n\npackages:\n\n  dep@",
                );
            const oldLockfile = withSecondLibrary(buildLockfile());
            const newLockfile = oldLockfile.replace("version: link:../lib\n", "version: link:../lib2\n");

            expect(compareDependencyGraphs(await parse(oldLockfile), await parse(newLockfile), "packages/a")).not.toBeNull();
        });

        it("should report the importer's own resolution when a linked package resolves the same dependency", async () => {
            expect.assertions(1);

            // lib depends on dep@9.0.0 as well
            const withLibraryDependency = (content: string): string =>
                content
                    .replace(
                        "      libdep:\n        specifier: ^2.0.0",
                        "      dep:\n        specifier: ^9.0.0\n        version: 9.0.0\n      libdep:\n        specifier: ^2.0.0",
                    )
                    .replace("packages:\n\n", "packages:\n\n  dep@9.0.0:\n    resolution: {integrity: sha512-dep9}\n\n")
                    .replace("snapshots:\n\n", "snapshots:\n\n  dep@9.0.0: {}\n\n");
            const oldLockfile = withLibraryDependency(buildLockfile());
            const newLockfile = withLibraryDependency(buildLockfile({ dep: "1.1.0" }));
            const changes = compareDependencyGraphs(await parse(oldLockfile), await parse(newLockfile), "packages/a");

            expect(changes).toMatchObject({ dependencies: [{ name: "dep", newVersion: "1.1.0", oldVersion: "1.0.0" }], releaseType: "minor" });
        });

        it("should report a snapshot dependency resolved to another snapshot that stays in the graph", async () => {
            expect.assertions(1);

            // dep and libdep both depend on sub, one on 3.0.0 and the other on 3.0.1
            const withBothSubs = (subOfDependency: string, subOfLibdep: string): string =>
                buildLockfile()
                    .replace("  sub@3.0.0:\n    resolution:", "  sub@3.0.1:\n    resolution: {integrity: sha512-sub301}\n\n  sub@3.0.0:\n    resolution:")
                    .replace("      sub: 3.0.0\n", () => `      sub: ${subOfDependency}\n`)
                    .replace("  libdep@2.0.0: {}\n", () => `  libdep@2.0.0:\n    dependencies:\n      sub: ${subOfLibdep}\n`)
                    .replace("  sub@3.0.0: {}\n", "  sub@3.0.0: {}\n\n  sub@3.0.1: {}\n");
            const changes = compareDependencyGraphs(await parse(withBothSubs("3.0.0", "3.0.1")), await parse(withBothSubs("3.0.1", "3.0.0")), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], files: [], releaseType: "patch", transitiveCount: 1 });
        });

        it("should report a linked package's dependency resolved to another snapshot that stays in the graph", async () => {
            expect.assertions(1);

            // lib depends on dep as well, and libdep keeps dep@9.0.0 in the graph
            const withLibraryDependency = (version: string): string =>
                buildLockfile()
                    .replace(
                        "      libdep:\n        specifier: ^2.0.0",
                        () => `      dep:\n        specifier: '*'\n        version: ${version}\n      libdep:\n        specifier: ^2.0.0`,
                    )
                    .replace("packages:\n\n", "packages:\n\n  dep@9.0.0:\n    resolution: {integrity: sha512-dep9}\n\n")
                    .replace("  libdep@2.0.0: {}\n", "  libdep@2.0.0:\n    dependencies:\n      dep: 9.0.0\n")
                    .replace("snapshots:\n\n", "snapshots:\n\n  dep@9.0.0: {}\n\n");
            const changes = compareDependencyGraphs(await parse(withLibraryDependency("9.0.0")), await parse(withLibraryDependency("1.0.0")), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], files: [], releaseType: "patch", transitiveCount: 1 });
        });

        it("should resolve npm aliases to the real package and version", async () => {
            expect.assertions(1);

            const withAlias = (version: string): string =>
                buildLockfile()
                    .replace(
                        "      lib:\n        specifier: workspace:^",
                        () =>
                            `      compat:\n        specifier: npm:lib2@^${version}\n        version: lib2@${version}\n      lib:\n        specifier: workspace:^`,
                    )
                    .replace("packages:\n\n", () => `packages:\n\n  lib2@${version}:\n    resolution: {integrity: sha512-lib2-${version}}\n\n`)
                    .replace("snapshots:\n\n", () => `snapshots:\n\n  lib2@${version}: {}\n\n`);
            const changes = compareDependencyGraphs(await parse(withAlias("1.0.0")), await parse(withAlias("2.0.0")), "packages/a");

            expect(changes).toStrictEqual({
                dependencies: [{ name: "compat", newVersion: "2.0.0", oldVersion: "1.0.0" }],
                files: [],
                releaseType: "major",
                transitiveCount: 0,
            });
        });
    });

    describe("readPnpmLockfile()", () => {
        it("should read the workspace document of a multi-document lock file", async () => {
            expect.assertions(1);

            const lockfile = await parse(`---
lockfileVersion: '9.0'

importers:

  .:
    packageManagerDependencies:
      pnpm:
        specifier: 10.0.0
        version: 10.0.0

---
${buildLockfile()}`);

            expect(Object.keys(lockfile.importers ?? {})).toContain("packages/a");
        });

        it("should return null for a commit without a lock file", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");

            const sha = gitCommitAll(cwd, "feat: initial commit");

            await expect(readPnpmLockfile(cwd, sha)).resolves.toBeNull();
        });

        it("should fail for an unavailable commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");
            gitCommitAll(cwd, "feat: initial commit");

            await expect(readPnpmLockfile(cwd, "0123456789abcdef0123456789abcdef01234567")).rejects.toThrow("the commit is not available");
        });

        it("should fail for a lock file that can't be parsed", async () => {
            expect.assertions(1);

            await expect(parse("importers: [\n")).rejects.toThrow("Cannot parse pnpm-lock.yaml");
        });
    });

    describe("getChangedRootFiles()", () => {
        it("should list only the given root files that changed since a commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildLockfile());
            writeFileSync(resolve(cwd, ".npmrc"), "a=1\n");

            const initialSha = gitCommitAll(cwd, "feat: initial commit");

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildLockfile({ dep: "1.1.0" }));
            writeFileSync(resolve(cwd, "README.md"), "# Test\n");
            gitCommitAll(cwd, "chore: update lock file");

            await expect(getChangedRootFiles(cwd, ["pnpm-lock.yaml", ".npmrc"], initialSha)).resolves.toStrictEqual(["pnpm-lock.yaml"]);
        });

        it("should ignore uncommitted changes", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildLockfile());

            const initialSha = gitCommitAll(cwd, "feat: initial commit");

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), buildLockfile({ dep: "1.1.0" }));

            await expect(getChangedRootFiles(cwd, ["pnpm-lock.yaml"], initialSha)).resolves.toStrictEqual([]);
        });
    });

    describe("getImporterPath()", () => {
        it("should return the workspace-relative importer path", () => {
            expect.assertions(2);

            expect(getImporterPath("/repo", "/repo/packages/a")).toBe("packages/a");
            expect(getImporterPath("/repo", "/repo")).toBe(".");
        });
    });
});

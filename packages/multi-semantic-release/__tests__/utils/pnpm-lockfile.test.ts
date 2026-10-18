import { describe, expect, it } from "vitest";

import type { PnpmLockfile } from "../../src/utils/pnpm-lockfile";
import { compareDependencyGraphs, isSupportedLockfile, parsePnpmLockfile } from "../../src/utils/pnpm-lockfile";
import { buildPnpmLockfile as buildLockfile } from "../helpers/pnpm-lockfile";

const parse = (content: string): PnpmLockfile => parsePnpmLockfile(content) as PnpmLockfile;

describe("pnpm-lockfile", () => {
    describe("compareDependencyGraphs()", () => {
        it("should report no changes for an identical lock file", () => {
            expect.assertions(1);

            const lockfile = parse(buildLockfile());

            expect(compareDependencyGraphs(lockfile, lockfile, "packages/a")).toBeUndefined();
        });

        it("should report a changed direct dependency with its release type", () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(parse(buildLockfile()), parse(buildLockfile({ dep: "1.1.0" })), "packages/a");

            expect(changes).toStrictEqual({
                dependencies: [{ name: "dep", newVersion: "1.1.0", oldVersion: "1.0.0", releaseType: "minor" }],
                releaseType: "minor",
                transitiveCount: 0,
            });
        });

        it("should report a transitive-only change", () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(parse(buildLockfile()), parse(buildLockfile({ sub: "3.0.1" })), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], releaseType: "patch", transitiveCount: 1 });
        });

        it("should report a changed integrity of the same version", () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(parse(buildLockfile()), parse(buildLockfile({ subIntegrity: "sha512-republished" })), "packages/a");

            expect(changes?.transitiveCount).toBe(1);
        });

        it("should follow workspace links into production dependencies of linked packages", () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(parse(buildLockfile()), parse(buildLockfile({ libdep: "2.0.1" })), "packages/a");

            expect(changes?.dependencies).toStrictEqual([{ name: "libdep", newVersion: "2.0.1", oldVersion: "2.0.0", releaseType: "patch" }]);
        });

        it("should ignore devDependencies", () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(parse(buildLockfile()), parse(buildLockfile({ tool: "1.1.0" })), "packages/a");

            expect(changes).toBeUndefined();
        });

        it("should ignore changes outside the package's dependency graph", () => {
            expect.assertions(1);

            const changes = compareDependencyGraphs(parse(buildLockfile()), parse(buildLockfile({ dep: "1.1.0" })), "packages/b");

            expect(changes).toBeUndefined();
        });

        it("should report a peer context change of the same version", () => {
            expect.assertions(1);

            const oldLockfile = parse(buildLockfile());
            const newLockfile = parse(
                buildLockfile()
                    .replace("version: 1.0.0\n      lib:", "version: 1.0.0(peer@1.0.0)\n      lib:")
                    .replace("snapshots:\n\n  dep@1.0.0:", "snapshots:\n\n  dep@1.0.0(peer@1.0.0):"),
            );

            expect(compareDependencyGraphs(oldLockfile, newLockfile, "packages/a")).toStrictEqual({
                dependencies: [],
                releaseType: "patch",
                transitiveCount: 1,
            });
        });

        it("should report nothing without a baseline", () => {
            expect.assertions(1);

            const lockfile = parse(buildLockfile());

            expect(compareDependencyGraphs(lockfile, lockfile, "packages/new")).toBeUndefined();
        });

        it("should report added and removed direct dependencies", () => {
            expect.assertions(2);

            const withoutOther = parse(buildLockfile());
            const withOther = parse(
                buildLockfile().replace(
                    "      lib:\n        specifier: workspace:^",
                    "      other:\n        specifier: ^1.0.0\n        version: 1.0.0\n      lib:\n        specifier: workspace:^",
                ),
            );

            expect(compareDependencyGraphs(withoutOther, withOther, "packages/a")?.dependencies).toStrictEqual([
                { name: "other", newVersion: "1.0.0", oldVersion: undefined, releaseType: "patch" },
            ]);
            expect(compareDependencyGraphs(withOther, withoutOther, "packages/a")?.dependencies).toStrictEqual([
                { name: "other", newVersion: undefined, oldVersion: "1.0.0", releaseType: "patch" },
            ]);
        });

        it("should follow optionalDependencies", () => {
            expect.assertions(1);

            const asOptional = (content: string): string => content.replace("  packages/a:\n    dependencies:", "  packages/a:\n    optionalDependencies:");
            const oldLockfile = asOptional(buildLockfile());
            const newLockfile = asOptional(buildLockfile({ sub: "3.0.1" }));
            const changes = compareDependencyGraphs(parse(oldLockfile), parse(newLockfile), "packages/a");

            expect(changes?.transitiveCount).toBe(1);
        });

        it("should report a workspace link pointing to another package with the same dependencies", () => {
            expect.assertions(1);

            const withSecondLibrary = (content: string): string =>
                content.replace(
                    "packages:\n\n  dep@",
                    "  packages/lib2:\n    dependencies:\n      libdep:\n        specifier: ^2.0.0\n        version: 2.0.0\n\npackages:\n\n  dep@",
                );
            const oldLockfile = withSecondLibrary(buildLockfile());
            const newLockfile = oldLockfile.replace("version: link:../lib\n", "version: link:../lib2\n");

            expect(compareDependencyGraphs(parse(oldLockfile), parse(newLockfile), "packages/a")).toBeDefined();
        });

        it("should report the importer's own resolution when a linked package resolves the same dependency", () => {
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
            const changes = compareDependencyGraphs(parse(oldLockfile), parse(newLockfile), "packages/a");

            expect(changes).toMatchObject({ dependencies: [{ name: "dep", newVersion: "1.1.0", oldVersion: "1.0.0" }], releaseType: "minor" });
        });

        it("should report a snapshot dependency resolved to another snapshot that stays in the graph", () => {
            expect.assertions(1);

            // dep and libdep both depend on sub, one on 3.0.0 and the other on 3.0.1
            const withBothSubs = (subOfDependency: string, subOfLibdep: string): string =>
                buildLockfile()
                    .replace("  sub@3.0.0:\n    resolution:", "  sub@3.0.1:\n    resolution: {integrity: sha512-sub301}\n\n  sub@3.0.0:\n    resolution:")
                    .replace("      sub: 3.0.0\n", () => `      sub: ${subOfDependency}\n`)
                    .replace("  libdep@2.0.0: {}\n", () => `  libdep@2.0.0:\n    dependencies:\n      sub: ${subOfLibdep}\n`)
                    .replace("  sub@3.0.0: {}\n", "  sub@3.0.0: {}\n\n  sub@3.0.1: {}\n");
            const changes = compareDependencyGraphs(parse(withBothSubs("3.0.0", "3.0.1")), parse(withBothSubs("3.0.1", "3.0.0")), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], releaseType: "patch", transitiveCount: 1 });
        });

        it("should report a linked package's dependency resolved to another snapshot that stays in the graph", () => {
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
            const changes = compareDependencyGraphs(parse(withLibraryDependency("9.0.0")), parse(withLibraryDependency("1.0.0")), "packages/a");

            expect(changes).toStrictEqual({ dependencies: [], releaseType: "patch", transitiveCount: 1 });
        });

        it("should resolve npm aliases to the real package and version", () => {
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
            const changes = compareDependencyGraphs(parse(withAlias("1.0.0")), parse(withAlias("2.0.0")), "packages/a");

            expect(changes).toStrictEqual({
                dependencies: [{ name: "compat", newVersion: "2.0.0", oldVersion: "1.0.0", releaseType: "major" }],
                releaseType: "major",
                transitiveCount: 0,
            });
        });

        it("should count a changed version that isn't semver as a patch", () => {
            expect.assertions(1);

            // semver.coerce would read these tarball URLs as 4.0.0 and 9.0.0, a "major" change
            const oldLockfile = buildLockfile({ dep: "https://codeload.github.com/a/dep/tar.gz/4f2a9c" });
            const newLockfile = buildLockfile({ dep: "https://codeload.github.com/a/dep/tar.gz/9e1b" });

            expect(compareDependencyGraphs(parse(oldLockfile), parse(newLockfile), "packages/a")).toMatchObject({
                dependencies: [
                    { name: "dep", newVersion: "https://codeload.github.com/a/dep/tar.gz/9e1b", oldVersion: "https://codeload.github.com/a/dep/tar.gz/4f2a9c" },
                ],
                releaseType: "patch",
            });
        });

        it("should report an npm alias pointing to another package of the same version", () => {
            expect.assertions(1);

            const withAlias = (target: string): string =>
                buildLockfile()
                    .replace(
                        "      lib:\n        specifier: workspace:^",
                        () =>
                            `      compat:\n        specifier: npm:${target}@^1.0.0\n        version: ${target}@1.0.0\n      lib:\n        specifier: workspace:^`,
                    )
                    .replace("packages:\n\n", () => `packages:\n\n  ${target}@1.0.0:\n    resolution: {integrity: sha512-${target}}\n\n`)
                    .replace("snapshots:\n\n", () => `snapshots:\n\n  ${target}@1.0.0: {}\n\n`);
            const changes = compareDependencyGraphs(parse(withAlias("lib2")), parse(withAlias("lib3")), "packages/a");

            expect(changes).toStrictEqual({
                dependencies: [{ name: "compat", newVersion: "npm:lib3@1.0.0", oldVersion: "npm:lib2@1.0.0", releaseType: "patch" }],
                releaseType: "patch",
                transitiveCount: 0,
            });
        });
    });

    describe("parsePnpmLockfile()", () => {
        it("should read the workspace document of a multi-document lock file", () => {
            expect.assertions(1);

            const lockfile = parse(`---
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

        it("should return undefined for a document without importers", () => {
            expect.assertions(1);

            expect(parsePnpmLockfile("lockfileVersion: '9.0'\n")).toBeUndefined();
        });

        it("should fail for a lock file that can't be parsed", () => {
            expect.assertions(1);

            expect(() => parse("importers: [\n")).toThrow("Cannot parse pnpm-lock.yaml");
        });
    });

    describe("isSupportedLockfile()", () => {
        it("should support lock file version 9 only", () => {
            expect.assertions(2);

            const lockfileV9 = parse(buildLockfile());
            const lockfileV6 = buildLockfile().replace("lockfileVersion: '9.0'", "lockfileVersion: '6.0'");

            expect(isSupportedLockfile(lockfileV9)).toBe(true);
            expect(isSupportedLockfile(parse(lockfileV6))).toBe(false);
        });
    });
});

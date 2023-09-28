import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNextPreVersion, getNextVersion, getPreReleaseTag, getVersionFromTag, resolveNextVersion, resolveReleaseType } from "../../lib/update-deps.js";

describe("update-deps", () => {
    describe("resolveNextVersion()", () => {
        it.each([
            ["1.0.0", "1.0.1", undefined, "1.0.1"],
            ["1.0.0", "1.0.1", "override", "1.0.1"],

            ["*", "1.3.0", "satisfy", "*"],
            ["^1.0.0", "1.0.1", "satisfy", "^1.0.0"],
            ["^1.2.0", "1.3.0", "satisfy", "^1.2.0"],
            ["1.2.x", "1.2.2", "satisfy", "1.2.x"],

            ["~1.0.0", "1.1.0", "inherit", "~1.1.0"],
            ["1.2.x", "1.2.1", "inherit", "1.2.x"],
            ["1.2.x", "1.3.0", "inherit", "1.3.x"],
            ["^1.0.0", "2.0.0", "inherit", "^2.0.0"],
            ["*", "2.0.0", "inherit", "*"],
            ["~1.0", "2.0.0", "inherit", "~2.0"],
            ["~2.0", "2.1.0", "inherit", "~2.1"],

            ["~1.0.0", "1.1.0", "ignore", "~1.0.0"],
            ["1.2.x", "1.2.1", "ignore", "1.2.x"],
            ["1.2.x", "1.3.0", "ignore", "1.2.x"],
            ["^1.0.0", "2.0.0", "ignore", "^1.0.0"],
            ["*", "2.0.0", "ignore", "*"],
            ["~1.0", "2.0.0", "ignore", "~1.0"],
            ["~2.0", "2.1.0", "ignore", "~2.0"],

            // cases of "workspace protocol" defined in yarn and pnpm
            ["workspace:*", "1.0.1", undefined, "1.0.1"],
            ["workspace:*", "1.0.1", "override", "1.0.1"],

            ["workspace:*", "1.3.0", "satisfy", "1.3.0"],
            ["workspace:~", "1.0.1", "satisfy", "~1.0.1"],
            ["workspace:^", "1.3.0", "satisfy", "^1.3.0"],
            // the following cases should be treated as if "workspace:" was removed
            ["workspace:^1.0.0", "1.0.1", "satisfy", "^1.0.0"],
            ["workspace:^1.2.0", "1.3.0", "satisfy", "^1.2.0"],
            ["workspace:1.2.x", "1.2.2", "satisfy", "1.2.x"],

            ["workspace:*", "1.3.0", "inherit", "1.3.0"],
            ["workspace:~", "1.1.0", "inherit", "~1.1.0"],
            ["workspace:^", "2.0.0", "inherit", "^2.0.0"],
            // the following cases should be treated as if "workspace:" was removed
            ["workspace:~1.0.0", "1.1.0", "inherit", "~1.1.0"],
            ["workspace:1.2.x", "1.2.1", "inherit", "1.2.x"],
            ["workspace:1.2.x", "1.3.0", "inherit", "1.3.x"],
            ["workspace:^1.0.0", "2.0.0", "inherit", "^2.0.0"],
            ["workspace:~1.0", "2.0.0", "inherit", "~2.0"],
            ["workspace:~2.0", "2.1.0", "inherit", "~2.1"],
            // the following cases should be treated as if "workspace:" was removed with ignore strategy
            ["workspace:~1.0.0", "1.1.0", "ignore", "~1.0.0"],
            ["workspace:1.2.x", "1.2.1", "ignore", "1.2.x"],
            ["workspace:1.2.x", "1.3.0", "ignore", "1.2.x"],
            ["workspace:^1.0.0", "2.0.0", "ignore", "^1.0.0"],
            ["workspace:~1.0", "2.0.0", "ignore", "~1.0"],
            ["workspace:~2.0", "2.1.0", "ignore", "~2.0"],
        ])("%s/%s/%s gives %s", (currentVersion, nextVersion, strategy, resolvedVersion) => {
            expect(resolveNextVersion(currentVersion, nextVersion, strategy)).toBe(resolvedVersion);
        });
    });

    describe("resolveReleaseType()", () => {
        it.each([
            [
                "returns own package's _nextType if exists",
                {
                    _nextType: "patch",
                    localDeps: [],
                },
                undefined,
                undefined,
                "patch",
            ],
            [
                "implements `inherit` strategy: returns the highest release type of any deps",
                {
                    _nextType: undefined,
                    localDeps: [
                        {
                            _lastRelease: { version: "1.0.0" },
                            _nextType: false,
                            localDeps: [
                                { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], name: "b" },
                                { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], name: "c" },
                                { _lastRelease: { version: "1.0.0" }, _nextType: "major", localDeps: [], name: "d" },
                            ],
                            manifest: { dependencies: { b: "1.0.0", c: "1.0.0", d: "1.0.0" } },
                            name: "a",
                        },
                    ],
                    manifest: { dependencies: { a: "1.0.0" } },
                },
                undefined,
                "inherit",
                "major",
            ],
            [
                "overrides dependent release type with custom value if defined",
                {
                    _nextType: undefined,
                    localDeps: [
                        {
                            _nextType: false,
                            localDeps: [
                                { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], name: "b" },
                                { _lastRelease: { version: "1.0.0" }, _nextType: "minor", localDeps: [], name: "c" },
                                { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], name: "d" },
                            ],
                            manifest: { dependencies: { b: "1.0.0", c: "1.0.0", d: "1.0.0" } },
                            name: "a",
                        },
                    ],
                    manifest: { dependencies: { a: "1.0.0" } },
                },
                undefined,
                "major",
                "major",
            ],
            [
                "uses `patch` strategy as default (legacy flow)",
                {
                    _nextType: undefined,
                    localDeps: [
                        {
                            _nextType: false,
                            localDeps: [
                                { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], name: "b" },
                                { _lastRelease: { version: "1.0.0" }, _nextType: "minor", localDeps: [], name: "c" },
                                { _lastRelease: { version: "1.0.0" }, _nextType: "major", localDeps: [], name: "d" },
                            ],
                            manifest: { dependencies: { b: "1.0.0", c: "1.0.0", d: "1.0.0" } },
                            name: "a",
                        },
                    ],
                    manifest: { dependencies: { a: "1.0.0" } },
                },
                undefined,
                undefined,
                "patch",
            ],
            [
                "returns undefined if no _nextRelease found",
                {
                    _nextType: undefined,
                    localDeps: [
                        {
                            _nextType: false,
                            localDeps: [
                                { _nextType: false, localDeps: [] },
                                {
                                    _nextType: undefined,
                                    localDeps: [{ _nextType: undefined, localDeps: [] }],
                                },
                            ],
                        },
                    ],
                },
                undefined,
                undefined,
                undefined,
            ],
        ])("%s", (name, package_, bumpStrategy, releaseStrategy, result) => {
            expect(resolveReleaseType(package_, bumpStrategy, releaseStrategy)).toBe(result);
        });

        it("`override` + `prefix` injects carets to the manifest", () => {
            const packageB = { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], name: "b" };
            const packageC = { _lastRelease: { version: "1.0.0" }, _nextType: "minor", localDeps: [], name: "c" };
            const packageD = { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], name: "d" };
            const packageA = {
                _nextType: false,
                localDeps: [packageB, packageC, packageD],
                manifest: { dependencies: { b: "1.0.0", c: "1.0.0", d: "1.0.0" } },
                name: "a",
            };
            const package_ = {
                _nextType: undefined,
                localDeps: [packageA],
                manifest: { dependencies: { a: "1.0.0" } },
                name: "root",
            };

            const type = resolveReleaseType(package_, "override", "patch", [], "^");

            expect(type).toBe("patch");
            expect(package_._nextType).toBe("patch");

            expect(package_.manifest.dependencies.a).toBe("1.0.0");
            expect(packageA.manifest.dependencies.b).toBe("1.0.0");
            expect(packageA.manifest.dependencies.c).toBe("^1.1.0");
            expect(packageA.manifest.dependencies.d).toBe("^1.0.1");
        });
    });

    describe("getNextVersion()", () => {
        it.each([
            [undefined, "patch", "1.0.0"],
            ["1.0.0", "patch", "1.0.1"],
            ["2.0.0", undefined, "2.0.0"],
            ["1.0.0-dev.1", "major", "1.0.0"],
            ["1.0.0-dev.1", undefined, "1.0.0-dev.1"],
            ["1.0.0-dev.1", "minor", "1.0.0"],
            ["1.0.0-dev.1", "patch", "1.0.0"],
        ])("%s and %s gives %s", (lastVersion, releaseType, nextVersion) => {
            expect(
                getNextVersion({
                    _lastRelease: { version: lastVersion },
                    _nextType: releaseType,
                }),
            ).toBe(nextVersion);
        });
    });

    describe("getNextPreVersion()", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it.each([
            [undefined, "patch", "rc", "1.0.0-rc.1"],
            [undefined, "patch", "rc", "1.0.0-rc.1"],
            [null, "patch", "rc", "1.0.0-rc.1"],
            [null, "patch", "rc", "1.0.0-rc.1"],
            ["1.0.0-rc.0", "minor", "dev", "1.0.0-dev.1"],
            ["1.0.0-dev.0", "major", "dev", "1.0.0-dev.1"],
            ["11.0.0", "major", "beta", "12.0.0-beta.1"],
            ["1.0.0", "minor", "beta", "1.1.0-beta.1"],
            ["1.0.0", "patch", "beta", "1.0.1-beta.1"],
        ])("%s and %s gives %s", (lastVersion, releaseType, preRelease, nextVersion) => {
            expect(
                getNextPreVersion({
                    _branch: "master",
                    _lastRelease: { version: lastVersion },
                    _nextType: releaseType,
                    _preRelease: preRelease,
                    name: "testing-package",
                }),
            ).toBe(nextVersion);

            expect(
                getNextPreVersion({
                    _branch: "master",
                    _lastRelease: { version: lastVersion },
                    _nextType: releaseType,
                    _preRelease: preRelease,
                    name: "testing-package",
                }),
            ).toBe(nextVersion);
        });

        // Simulates us not using tags as criteria
        it.each([
            // prerelease channels just bump up the pre-release
            ["1.0.0-rc.0", "minor", "rc", "1.0.0-rc.1"],
            ["1.0.0-dev.0", "major", "dev", "1.0.0-dev.1"],
            ["1.0.0-dev.0", "major", "dev", "1.0.0-dev.1"],
            ["1.0.1-dev.0", "major", "dev", "1.0.1-dev.1"],
            // main channels obey the release type
            ["11.0.0", "major", "beta", "12.0.0-beta.1"],
            ["1.0.0", "minor", "beta", "1.1.0-beta.1"],
            ["1.0.0", "patch", "beta", "1.0.1-beta.1"],
        ])("no tag: %s and %s gives %s", (lastVersion, releaseType, preRelease, nextVersion) => {
            expect(
                getNextPreVersion({
                    _branch: "master",
                    _lastRelease: { version: lastVersion },
                    _nextType: releaseType,
                    _preRelease: preRelease,
                    name: "testing-package",
                }),
            ).toBe(nextVersion);
        });
    });

    describe("getPreReleaseTag()", () => {
        it.each([
            [undefined, null],
            [null, null],
            ["1.0.0-rc.0", "rc"],
            ["1.0.0-dev.0", "dev"],
            ["1.0.0-dev.2", "dev"],
            ["1.1.0-beta.0", "beta"],
            ["11.0.0", null],
            ["11.1.0", null],
            ["11.0.1", null],
        ])("%s gives %s", (version, preReleaseTag) => {
            expect(getPreReleaseTag(version)).toBe(preReleaseTag);
        });
    });

    describe("getVersionFromTag()", () => {
        it.each([
            [{}, undefined, null],
            [{ name: undefined }, undefined, null],
            [{}, null, null],
            [{ name: null }, null, null],
            [{ name: undefined }, "1.0.0", "1.0.0"],
            [{ name: null }, "1.0.0", "1.0.0"],
            [{ name: "abc" }, undefined, null],
            [{ name: "abc" }, null, null],
            [{ name: "abc" }, "1.0.0", "1.0.0"],
            [{ name: "dev" }, "1.0.0-dev.1", "1.0.0-dev.1"],
            [{ name: "app" }, "app@1.0.0-dev.1", "1.0.0-dev.1"],
            [{ name: "app" }, "app@1.0.0-devapp@.1", null],
            [{ name: "msr-test-a" }, "msr-test-a@1.0.0-rc.1", "1.0.0-rc.1"],
            [{ name: "msr.test.a" }, "msr.__tests__.a@1.0.0", "1.0.0"],
            [{ name: "msr_test_a" }, "msr_test_a@1.0.0", "1.0.0"],
            [{ name: "msr@test@a" }, "msr@__tests__@a@1.0.0", "1.0.0"],
            [{ name: "abc" }, "a.b.c-rc.0", null],
            [{ name: "abc" }, "1-rc.0", null],
            [{ name: "abc" }, "1.0.x-rc.0", null],
            [{ name: "abc" }, "1.x.0-rc.0", null],
            [{ name: "abc" }, "x.1.0-rc.0", null],
        ])("%s pkg with tag %s gives %s", (package_, tag, versionFromTag) => {
            expect(getVersionFromTag(package_, tag)).toBe(versionFromTag);
        });
    });
});

import { describe, expect, it } from "vitest";

import { resolveReleaseType } from "../src/update-deps";

describe("resolveReleaseType()", () => {
    it("works correctly with no deps", () => {
        expect.assertions(1);

        expect(resolveReleaseType({ localDeps: [] })).toBeUndefined();
    });

    it("works correctly with deps", () => {
        expect.assertions(6);

        const package1 = { _nextType: "patch", localDeps: [] };

        expect(resolveReleaseType(package1)).toBe("patch");

        const package2 = { _nextType: undefined, localDeps: [] };

        expect(resolveReleaseType(package2)).toBeUndefined();

        const package3 = {
            _nextType: undefined,
            localDeps: [
                { _nextType: false, localDeps: [] },
                { _nextType: false, localDeps: [] },
            ],
        };

        expect(resolveReleaseType(package3)).toBeUndefined();

        const package4 = {
            _nextType: undefined,
            localDeps: [
                { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], name: "a" },
                { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], name: "b" },
            ],
            manifest: { dependencies: { a: "1.0.0" } },
        };

        expect(resolveReleaseType(package4)).toBe("patch");

        const package5 = {
            _nextType: undefined,
            localDeps: [
                {
                    _nextType: false,
                    localDeps: [
                        { _nextType: false, localDeps: [] },
                        { _nextType: false, localDeps: [] },
                    ],
                },
            ],
        };

        expect(resolveReleaseType(package5)).toBeUndefined();

        const package6 = {
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
        };

        expect(resolveReleaseType(package6, "override", "inherit")).toBe("major");
    });

    it("no infinite loops", () => {
        expect.assertions(4);

        const package1 = { _nextType: "patch", localDeps: [] };

        package1.localDeps.push(package1);

        expect(resolveReleaseType(package1)).toBe("patch");

        const package2 = { _nextType: undefined, localDeps: [] };

        package2.localDeps.push(package2);

        expect(resolveReleaseType(package2)).toBeUndefined();

        const package3 = {
            _nextType: undefined,
            localDeps: [
                { _nextType: false, localDeps: [] },
                { _nextType: false, localDeps: [] },
            ],
        };

        package3.localDeps[0].localDeps.push(package3.localDeps[0]);

        expect(resolveReleaseType(package3)).toBeUndefined();

        const package4 = {
            _nextType: undefined,
            localDeps: [
                { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], name: "a" },
                { _lastRelease: { version: "1.0.0" }, _nextType: "major", localDeps: [], name: "b" },
            ],
            manifest: { dependencies: { a: "1.0.0", b: "1.0.0" } },
        };

        package4.localDeps[0].localDeps.push(package4.localDeps[0]);

        expect(resolveReleaseType(package4)).toBe("patch");
    });
});

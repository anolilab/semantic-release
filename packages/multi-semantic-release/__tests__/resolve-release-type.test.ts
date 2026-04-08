import { describe, expect, it } from "vitest";

import type { Package } from "../src/types";
import { resolveReleaseType } from "../src/update-deps";

describe("resolveReleaseType()", () => {
    it("works correctly with no deps", () => {
        expect.assertions(1);

        expect(resolveReleaseType({ localDeps: [], manifest: {} } as unknown as Package)).toBeUndefined();
    });

    it("works correctly with deps", () => {
        expect.assertions(6);

        const package1 = { _nextType: "patch", localDeps: [], manifest: {} } as unknown as Package;

        expect(resolveReleaseType(package1)).toBe("patch");

        const package2 = { _nextType: undefined, localDeps: [], manifest: {} } as unknown as Package;

        expect(resolveReleaseType(package2)).toBeUndefined();

        const package3 = {
            _nextType: undefined,
            localDeps: [
                { _nextType: false, localDeps: [], manifest: {} },
                { _nextType: false, localDeps: [], manifest: {} },
            ],
            manifest: {},
        } as unknown as Package;

        expect(resolveReleaseType(package3)).toBeUndefined();

        const package4 = {
            _nextType: undefined,
            localDeps: [
                { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], manifest: {}, name: "a" },
                { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], manifest: {}, name: "b" },
            ],
            manifest: { dependencies: { a: "1.0.0" } },
        } as unknown as Package;

        expect(resolveReleaseType(package4)).toBe("patch");

        const package5 = {
            _nextType: undefined,
            localDeps: [
                {
                    _nextType: false,
                    localDeps: [
                        { _nextType: false, localDeps: [], manifest: {} },
                        { _nextType: false, localDeps: [], manifest: {} },
                    ],
                    manifest: {},
                },
            ],
            manifest: {},
        } as unknown as Package;

        expect(resolveReleaseType(package5)).toBeUndefined();

        const package6 = {
            _nextType: undefined,
            localDeps: [
                {
                    _lastRelease: { version: "1.0.0" },
                    _nextType: false,
                    localDeps: [
                        { _lastRelease: { version: "1.0.0" }, _nextType: false, localDeps: [], manifest: {}, name: "b" },
                        { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [], manifest: {}, name: "c" },
                        { _lastRelease: { version: "1.0.0" }, _nextType: "major", localDeps: [], manifest: {}, name: "d" },
                    ],
                    manifest: { dependencies: { b: "1.0.0", c: "1.0.0", d: "1.0.0" } },
                    name: "a",
                },
            ],
            manifest: { dependencies: { a: "1.0.0" } },
        } as unknown as Package;

        expect(resolveReleaseType(package6, "override", "inherit")).toBe("patch");
    });

    it("no infinite loops", () => {
        expect.assertions(4);

        const package1 = { _nextType: "patch", localDeps: [] as unknown[], manifest: {} } as unknown as Package;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (package1 as any).localDeps.push(package1);

        expect(resolveReleaseType(package1)).toBe("patch");

        const package2 = { _nextType: undefined, localDeps: [] as unknown[], manifest: {} } as unknown as Package;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (package2 as any).localDeps.push(package2);

        expect(resolveReleaseType(package2)).toBeUndefined();

        const package3 = {
            _nextType: undefined,
            localDeps: [
                { _nextType: false, localDeps: [] as unknown[], manifest: {} },
                { _nextType: false, localDeps: [] as unknown[], manifest: {} },
            ],
            manifest: {},
        } as unknown as Package;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (package3 as any).localDeps[0].localDeps.push((package3 as any).localDeps[0]);

        expect(resolveReleaseType(package3)).toBeUndefined();

        const package4 = {
            _nextType: undefined,
            localDeps: [
                { _lastRelease: { version: "1.0.0" }, _nextType: "patch", localDeps: [] as unknown[], manifest: {}, name: "a" },
                { _lastRelease: { version: "1.0.0" }, _nextType: "major", localDeps: [] as unknown[], manifest: {}, name: "b" },
            ],
            manifest: { dependencies: { a: "1.0.0", b: "1.0.0" } },
        } as unknown as Package;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (package4 as any).localDeps[0].localDeps.push((package4 as any).localDeps[0]);

        expect(resolveReleaseType(package4)).toBe("patch");
    });
});

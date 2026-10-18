import { describe, expect, it } from "vitest";

import { getVersionChangeLevel, isReleaseLevel, maxReleaseType } from "../../src/utils/release-type";

describe("release-type", () => {
    describe("maxReleaseType()", () => {
        it("should pick the most severe release type", () => {
            expect.assertions(3);

            expect(maxReleaseType("patch", "major", "minor")).toBe("major");
            expect(maxReleaseType(undefined, "minor", null)).toBe("minor");
            expect(maxReleaseType()).toBeUndefined();
        });

        it("should keep a value that isn't a release level unless something more severe follows", () => {
            expect.assertions(2);

            expect(maxReleaseType("prerelease", undefined)).toBe("prerelease");
            expect(maxReleaseType("prerelease", "patch")).toBe("patch");
        });
    });

    describe("getVersionChangeLevel()", () => {
        it("should classify version changes, ignoring range prefixes", () => {
            expect.assertions(4);

            expect(getVersionChangeLevel("^1.2.3", "^2.0.0")).toBe("major");
            expect(getVersionChangeLevel("~1.2.3", "~1.3.0")).toBe("minor");
            expect(getVersionChangeLevel("1.2.3", "1.2.4")).toBe("patch");
            expect(getVersionChangeLevel("1.2.3", "1.2.3")).toBeUndefined();
        });

        it("should classify range changes by their lowest version", () => {
            expect.assertions(3);

            expect(getVersionChangeLevel("^5", "^6")).toBe("major");
            expect(getVersionChangeLevel(">=4.17.0", ">=4.18.0")).toBe("minor");
            expect(getVersionChangeLevel("4.x", "4.x")).toBeUndefined();
        });

        it("should not classify versions that aren't valid semver", () => {
            expect.assertions(3);

            // semver.coerce would read these git tarball URLs as 4.0.0 and 9.0.0, a "major" change
            expect(getVersionChangeLevel("https://codeload.github.com/a/b/tar.gz/4f2a9c", "https://codeload.github.com/a/b/tar.gz/9e1b")).toBeUndefined();
            expect(getVersionChangeLevel("latest", "1.0.0")).toBeUndefined();
            expect(getVersionChangeLevel("workspace:*", "workspace:^")).toBeUndefined();
        });
    });

    describe("isReleaseLevel()", () => {
        it("should accept only patch, minor and major", () => {
            expect.assertions(3);

            expect(isReleaseLevel("minor")).toBe(true);
            expect(isReleaseLevel("inherit")).toBe(false);
            expect(isReleaseLevel(undefined)).toBe(false);
        });
    });
});

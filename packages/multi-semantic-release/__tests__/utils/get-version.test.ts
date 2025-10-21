import { describe, expect, it } from "vitest";

import { getHighestVersion, getLatestVersion } from "../../src/utils/get-version";

type Version = string | null | undefined;

describe("getHighestVersion()", () => {
    it.each([
        ["1.0.0", "2.0.0", "2.0.0"],
        ["1.1.1", "1.0.0", "1.1.1"],
        [null, "1.0.0", "1.0.0"],
        ["1.0.0", undefined, "1.0.0"],
        [undefined, undefined, undefined],
    ])("%s/%s gives highest as %s", (version1, version2, high) => {
        expect.assertions(1);

        expect(getHighestVersion(version1, version2)).toBe(high);
    });
});

describe("getLatestVersion()", () => {
    it.each([
        [["1.2.3-alpha.3", "1.2.0", "1.0.1", "1.0.0-alpha.1"], null, "1.2.0"],
        [["1.2.3-alpha.3", "1.2.3-alpha.2"], null, undefined],
        [["1.2.3-alpha.3", "1.2.0", "1.0.1", "1.0.0-alpha.1"], true, "1.2.3-alpha.3"],
        [["1.2.3-alpha.3", "1.2.3-alpha.2"], true, "1.2.3-alpha.3"],
        [[], {}, undefined],
    ])("%s/%s gives latest as %s", (versions, withPrerelease, latest) => {
        expect.assertions(1);

        expect(getLatestVersion(versions, withPrerelease)).toBe(latest);
    });
});

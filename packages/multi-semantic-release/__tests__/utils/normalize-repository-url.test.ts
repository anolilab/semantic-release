/* eslint-disable unicorn/name-replacements, sonarjs/parameterized-tests */
import { describe, expect, it } from "vitest";

import normalizeRepoUrl from "../../src/utils/normalize-repository-url";

describe("normalizeRepositoryUrl()", () => {
    it("should remove git+https:// prefix", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("git+https://github.com/visulima/packem.git")).toBe("https://github.com/visulima/packem.git");
    });

    it("should remove git+ssh:// prefix", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("git+ssh://git@github.com/visulima/packem.git")).toBe("ssh://git@github.com/visulima/packem.git");
    });

    it("should convert git:// to https://", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("git://github.com/visulima/packem.git")).toBe("https://github.com/visulima/packem.git");
    });

    it("should leave https:// URLs unchanged", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("https://github.com/visulima/packem.git")).toBe("https://github.com/visulima/packem.git");
    });

    it("should leave ssh:// URLs unchanged", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("ssh://git@github.com/visulima/packem.git")).toBe("ssh://git@github.com/visulima/packem.git");
    });

    it("should handle undefined", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl(undefined)).toBeUndefined();
    });

    it("should handle empty string", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("")).toBe("");
    });

    it("should handle URLs without protocol", () => {
        expect.assertions(1);

        expect(normalizeRepoUrl("github.com/visulima/packem.git")).toBe("github.com/visulima/packem.git");
    });
});

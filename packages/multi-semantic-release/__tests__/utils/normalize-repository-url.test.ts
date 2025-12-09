import { describe, expect, it } from "vitest";

import normalizeRepositoryUrl from "../../src/utils/normalize-repository-url";

describe("normalizeRepositoryUrl()", () => {
    it("should remove git+https:// prefix", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("git+https://github.com/visulima/packem.git")).toBe("https://github.com/visulima/packem.git");
    });

    it("should remove git+ssh:// prefix", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("git+ssh://git@github.com/visulima/packem.git")).toBe("ssh://git@github.com/visulima/packem.git");
    });

    it("should convert git:// to https://", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("git://github.com/visulima/packem.git")).toBe("https://github.com/visulima/packem.git");
    });

    it("should leave https:// URLs unchanged", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("https://github.com/visulima/packem.git")).toBe("https://github.com/visulima/packem.git");
    });

    it("should leave ssh:// URLs unchanged", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("ssh://git@github.com/visulima/packem.git")).toBe("ssh://git@github.com/visulima/packem.git");
    });

    it("should handle undefined", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl(undefined)).toBeUndefined();
    });

    it("should handle empty string", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("")).toBe("");
    });

    it("should handle URLs without protocol", () => {
        expect.assertions(1);

        expect(normalizeRepositoryUrl("github.com/visulima/packem.git")).toBe("github.com/visulima/packem.git");
    });

    it("should preserve URLs with authentication tokens", () => {
        expect.assertions(3);

        // GitLab CI token format
        expect(normalizeRepositoryUrl("https://gitlab-ci-token:token@git.afteroot.info/main/helm-charts.git")).toBe(
            "https://gitlab-ci-token:token@git.afteroot.info/main/helm-charts.git",
        );

        // GitHub token format
        expect(normalizeRepositoryUrl("https://token@github.com/owner/repo.git")).toBe("https://token@github.com/owner/repo.git");

        // git+https:// with token should still normalize the prefix but preserve auth
        expect(normalizeRepositoryUrl("git+https://gitlab-ci-token:token@git.afteroot.info/main/helm-charts.git")).toBe(
            "https://gitlab-ci-token:token@git.afteroot.info/main/helm-charts.git",
        );
    });
});

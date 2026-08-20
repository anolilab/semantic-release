import { generateNotes } from "@semantic-release/release-notes-generator";
import { describe, expect, it } from "vitest";

/**
 * conventional-changelog-conventionalcommits v10 renders through the function templates of
 * conventional-changelog-writer v9. `@semantic-release/release-notes-generator` still bundles
 * writer v8, which silently drops every commit group and emits a heading-only changelog.
 * This guards the pairing: a preset bump that outruns the writer fails here instead of
 * shipping empty release notes.
 */
describe("release notes preset compatibility", () => {
    it("renders commit groups for the conventionalcommits preset", async () => {
        expect.assertions(3);

        const commits = [
            { hash: "a".repeat(40), message: "feat(core): add a thing" },
            { hash: "b".repeat(40), message: "fix(core): stop breaking a thing" },
        ];

        const notes = await generateNotes(
            { preset: "conventionalcommits" },
            {
                commits,
                cwd: process.cwd(),
                lastRelease: { gitTag: "v1.0.0", version: "1.0.0" },
                nextRelease: { gitTag: "v1.1.0", version: "1.1.0" },
                options: { repositoryUrl: "https://github.com/anolilab/semantic-release" },
            },
        );

        expect(notes).toContain("### Features");
        expect(notes).toContain("add a thing");
        expect(notes).toContain("stop breaking a thing");
    });
});

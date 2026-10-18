import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getChangedFiles, getHeadCommit, readFileAtCommit } from "../../src/utils/git";
import { gitCommitAll, gitInit } from "../helpers/git";

const UNAVAILABLE_COMMIT = "0123456789abcdef0123456789abcdef01234567";

describe("git", () => {
    describe("readFileAtCommit()", () => {
        it("should read a file as it was at a commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, ".npmrc"), "a=1\n");

            const sha = gitCommitAll(cwd, "feat: initial commit");

            writeFileSync(resolve(cwd, ".npmrc"), "a=2\n");
            gitCommitAll(cwd, "chore: update .npmrc");

            await expect(readFileAtCommit(cwd, sha, ".npmrc")).resolves.toBe("a=1");
        });

        it("should return undefined for a commit without the file", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");

            const sha = gitCommitAll(cwd, "feat: initial commit");

            await expect(readFileAtCommit(cwd, sha, "pnpm-lock.yaml")).resolves.toBeUndefined();
        });

        it("should fail for an unavailable commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");
            gitCommitAll(cwd, "feat: initial commit");

            await expect(readFileAtCommit(cwd, UNAVAILABLE_COMMIT, "pnpm-lock.yaml")).rejects.toThrow("the commit is not available");
        });
    });

    describe("getChangedFiles()", () => {
        it("should list only the given files that changed since a commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
            writeFileSync(resolve(cwd, ".npmrc"), "a=1\n");

            const initialSha = gitCommitAll(cwd, "feat: initial commit");

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\nimporters: {}\n");
            writeFileSync(resolve(cwd, "README.md"), "# Test\n");
            gitCommitAll(cwd, "chore: update lock file");

            await expect(getChangedFiles(cwd, ["pnpm-lock.yaml", ".npmrc"], initialSha)).resolves.toStrictEqual(["pnpm-lock.yaml"]);
        });

        it("should ignore uncommitted changes", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

            const initialSha = gitCommitAll(cwd, "feat: initial commit");

            writeFileSync(resolve(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\nimporters: {}\n");

            await expect(getChangedFiles(cwd, ["pnpm-lock.yaml"], initialSha)).resolves.toStrictEqual([]);
        });

        it("should fail for an unavailable commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");
            gitCommitAll(cwd, "feat: initial commit");

            await expect(getChangedFiles(cwd, ["pnpm-lock.yaml"], UNAVAILABLE_COMMIT)).rejects.toThrow("Cannot diff");
        });
    });

    describe("getHeadCommit()", () => {
        it("should resolve HEAD to its commit SHA", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");

            const sha = gitCommitAll(cwd, "feat: initial commit");

            await expect(getHeadCommit(cwd)).resolves.toBe(sha);
        });
    });
});

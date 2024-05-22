import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { temporaryDirectory } from "tempy";
import { describe, expect, it } from "vitest";

import getCommitsFiltered from "../../lib/get-commits-filtered.js";
import { gitCommitAll, gitInit } from "../helpers/git.js";

describe("getCommitsFiltered()", () => {
    it("works correctly (no lastRelease)", async () => {
        expect.assertions(3);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        writeFileSync(`${cwd}/AAA.txt`, "AAA");

        gitCommitAll(cwd, "Commit 1");

        mkdirSync(`${cwd}/bbb`);
        writeFileSync(`${cwd}/bbb/BBB.txt`, "BBB");

        const sha2 = gitCommitAll(cwd, "Commit 2");

        mkdirSync(`${cwd}/ccc`);
        writeFileSync(`${cwd}/ccc/CCC.txt`, "CCC");

        gitCommitAll(cwd, "Commit 3");

        // Filter a single directory of the repo.
        const commits = await getCommitsFiltered(cwd, "bbb/");

        expect(commits).toHaveLength(1);
        expect(commits[0].hash).toBe(sha2);
        expect(commits[0].subject).toBe("Commit 2");
    });

    it("works correctly (with lastRelease)", async () => {
        expect.assertions(1);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        writeFileSync(`${cwd}/AAA.txt`, "AAA");

        gitCommitAll(cwd, "Commit 1");

        mkdirSync(`${cwd}/bbb`);
        writeFileSync(`${cwd}/bbb/BBB.txt`, "BBB");

        gitCommitAll(cwd, "Commit 2");

        mkdirSync(`${cwd}/ccc`);
        writeFileSync(`${cwd}/ccc/CCC.txt`, "CCC");

        const sha3 = gitCommitAll(cwd, "Commit 3");

        // Filter a single directory of the repo since sha3
        const commits = await getCommitsFiltered(cwd, "bbb/", sha3);

        expect(commits).toHaveLength(0);
    });

    it("works correctly (initial commit)", async () => {
        expect.assertions(2);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        mkdirSync(`${cwd}/bbb`);
        mkdirSync(`${cwd}/ccc`);
        writeFileSync(`${cwd}/AAA.txt`, "AAA");
        writeFileSync(`${cwd}/bbb/BBB.txt`, "BBB");
        writeFileSync(`${cwd}/ccc/CCC.txt`, "CCC");

        const sha = gitCommitAll(cwd, "Initial commit");

        // Filter a single directory of the repo.
        const commits = await getCommitsFiltered(cwd, "bbb/");

        expect(commits).toHaveLength(1);
        expect(commits[0].hash).toBe(sha);
    });

    it("typeError if cwd is not absolute path to directory", async () => {
        expect.assertions(6);

        await expect(getCommitsFiltered(123, ".")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(123, ".")).rejects.toMatchObject({
            message: expect.stringMatching("cwd: Must be directory that exists in the filesystem"),
        });
        await expect(getCommitsFiltered("aaa", ".")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered("aaa", ".")).rejects.toMatchObject({
            message: expect.stringMatching("cwd: Must be directory that exists in the filesystem"),
        });

        const cwd = temporaryDirectory();

        await expect(getCommitsFiltered(`${cwd}/abc`, ".")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(`${cwd}/abc`, ".")).rejects.toMatchObject({
            message: expect.stringMatching("cwd: Must be directory that exists in the filesystem"),
        });
    });

    it("typeError if dir is not path to directory", async () => {
        expect.assertions(6);

        const cwd = temporaryDirectory();

        await expect(getCommitsFiltered(cwd, 123)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, 123)).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must be valid path"),
        });
        await expect(getCommitsFiltered(cwd, "abc")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "abc")).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must be directory that exists in the filesystem"),
        });
        await expect(getCommitsFiltered(cwd, `${cwd}/abc`)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, `${cwd}/abc`)).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must be directory that exists in the filesystem"),
        });
    });

    it("typeError if dir is equal to cwd", async () => {
        expect.assertions(4);

        const cwd = temporaryDirectory();

        await expect(getCommitsFiltered(cwd, cwd)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, cwd)).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must not be equal to cwd"),
        });
        await expect(getCommitsFiltered(cwd, ".")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, ".")).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must not be equal to cwd"),
        });
    });

    it("typeError if dir is not inside cwd", async () => {
        expect.assertions(4);

        const cwd = temporaryDirectory();
        const direction = temporaryDirectory();

        await expect(getCommitsFiltered(cwd, direction)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, direction)).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must be inside cwd"),
        });
        await expect(getCommitsFiltered(cwd, "..")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "..")).rejects.toMatchObject({
            message: expect.stringMatching("dir: Must be inside cwd"),
        });
    });

    it("typeError if lastRelease is not 40char alphanumeric Git SHA hash", async () => {
        expect.assertions(6);

        const cwd = temporaryDirectory();

        mkdirSync(join(cwd, "dir"));

        await expect(getCommitsFiltered(cwd, "dir", false)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "dir", false)).rejects.toMatchObject({
            message: expect.stringMatching("lastRelease: Must be alphanumeric string with size 40 or empty"),
        });
        await expect(getCommitsFiltered(cwd, "dir", 123)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "dir", 123)).rejects.toMatchObject({
            message: expect.stringMatching("lastRelease: Must be alphanumeric string with size 40 or empty"),
        });
        await expect(getCommitsFiltered(cwd, "dir", "nottherightlength")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "dir", "nottherightlength")).rejects.toMatchObject({
            message: expect.stringMatching("lastRelease: Must be alphanumeric string with size 40 or empty"),
        });
    });

    it("typeError if nextRelease is not 40char alphanumeric Git SHA hash", async () => {
        expect.assertions(6);

        const cwd = temporaryDirectory();

        mkdirSync(join(cwd, "dir"));

        await expect(getCommitsFiltered(cwd, "dir", undefined, false)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "dir", undefined, false)).rejects.toMatchObject({
            message: expect.stringMatching("nextRelease: Must be alphanumeric string with size 40 or empty"),
        });
        await expect(getCommitsFiltered(cwd, "dir", undefined, 123)).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "dir", undefined, 123)).rejects.toMatchObject({
            message: expect.stringMatching("nextRelease: Must be alphanumeric string with size 40 or empty"),
        });
        await expect(getCommitsFiltered(cwd, "dir", undefined, "nottherightlength")).rejects.toBeInstanceOf(TypeError);
        await expect(getCommitsFiltered(cwd, "dir", undefined, "nottherightlength")).rejects.toMatchObject({
            message: expect.stringMatching("nextRelease: Must be alphanumeric string with size 40 or empty"),
        });
    });

    it("works correctly (with lastRelease and nextRelease)", async () => {
        expect.assertions(2);

        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        writeFileSync(`${cwd}/AAA.txt`, "AAA");

        gitCommitAll(cwd, "Commit 1");

        mkdirSync(`${cwd}/bbb`);
        writeFileSync(`${cwd}/bbb/BBB.txt`, "BBB");

        const sha2 = gitCommitAll(cwd, "Commit 2");

        writeFileSync(`${cwd}/bbb/BBB2.txt`, "BBB2");

        const sha3 = gitCommitAll(cwd, "Commit 3");

        mkdirSync(`${cwd}/ccc`);
        writeFileSync(`${cwd}/ccc/CCC.txt`, "CCC");

        gitCommitAll(cwd, "Commit 4");

        // Filter a single directory from sha2 (lastRelease) to sha3 (nextRelease)
        const commits = await getCommitsFiltered(cwd, "bbb/", sha2, sha3);

        expect(commits).toHaveLength(1);
        expect(commits[0].hash).toBe(sha3);
    });
});

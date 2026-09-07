import { mkdtempSync, realpathSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { chdir, cwd, env } from "node:process";

import { writeJsonSync } from "@visulima/fs";
import { join } from "@visulima/path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { rc } from "../src";

describe("rc-unmocked", () => {
    let cwdPath: string;
    let homePath: string;
    let originalCwd: string;

    const npmEnvironment: Record<keyof typeof env, string | undefined> = {};

    beforeEach(() => {
        originalCwd = cwd();

        // realpathSync because the temp dir is reached through a symlink on macOS,
        // and chdir reports the resolved path — the expected file lists are built
        // from these values, so both sides have to agree.
        const temporaryDirectory = tmpdir();

        cwdPath = realpathSync(mkdtempSync(pathJoin(temporaryDirectory, "rc-unmocked-")));
        homePath = realpathSync(mkdtempSync(pathJoin(temporaryDirectory, "rc-unmocked-home-")));

        // eslint-disable-next-line no-restricted-syntax
        for (const key in env) {
            if (!key.startsWith("npm_")) {
                continue;
            }

            npmEnvironment[key as keyof typeof env] = env[key];
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete env[key];
        }
    });

    afterEach(async () => {
        chdir(originalCwd);

        // eslint-disable-next-line no-restricted-syntax,guard-for-in
        for (const key in npmEnvironment) {
            env[key] = npmEnvironment[key];
        }

        await rm(cwdPath, { recursive: true });
        await rm(homePath, { recursive: true });
    });

    it("should find configs in different folders", () => {
        expect.assertions(1);

        const files = [join("grandparent", "parent", "cwd", ".bemrc"), join("grandparent", "parent", ".bemrc"), join("grandparent", ".bemrc")];

        files.forEach((file, index) => {
            writeJsonSync(join(cwdPath, file), { test: index });
        });

        // The default working directory is what is under test here, so move into it
        // for real rather than replacing process.cwd with a stub.
        chdir(join(cwdPath, "grandparent", "parent", "cwd"));

        expect(rc("bem", { home: homePath })).toStrictEqual({
            config: {
                test: 0,
            },
            files: files.map((file) => join(cwdPath, file)).toReversed(),
        });
    });

    it("should find configs in custom cwd", () => {
        expect.assertions(1);

        const files = [join("grandparent", "parent", "cwd", ".bemrc"), join("grandparent", "parent", ".bemrc"), join("grandparent", ".bemrc")];

        files.forEach((file, index) => {
            writeJsonSync(join(cwdPath, file), { test: index });
        });

        expect(
            rc("bem", {
                cwd: join(cwdPath, "grandparent", "parent", "cwd"),
                home: homePath,
            }),
        ).toStrictEqual({
            config: {
                test: 0,
            },
            files: files.map((file) => join(cwdPath, file)).toReversed(),
        });
    });
});

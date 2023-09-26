import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { execa } from "execa";
import { describe, expect, it } from "vitest";

import { copyDirectory } from "../helpers/file.js";
import { gitCommitAll, gitInit, gitInitOrigin, gitPush } from "../helpers/git.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = resolve(__dirname, "../../__fixtures__");
const msrBin = resolve(__dirname, "../../bin/cli.js");
const environment = {
    PATH: process.env.PATH,
};

describe("multi-semantic-release CLI", () => {
    it("initial commit (changes in all packages)", async () => {
        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd);
        gitPush(cwd);

        try {
            await execa("node", [msrBin, "--no-sequential-prepare"], { cwd, env: environment, extendEnv: false });
        } catch (error) {
            const { exitCode, stderr, stdout } = error;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(stdout).toMatch("Started multirelease! Loading 4 packages...");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(stderr).toMatch('Error: Cyclic dependency, node was:"msr-test-c"');
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(exitCode).toBe(1);
        }
    });

    it("initial commit (changes in 2 packages, 2 filtered out)", async () => {
        // Create Git repo with copy of Yarn workspaces fixture.
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspaces/`, cwd);

        gitCommitAll(cwd, "feat: Initial release");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Run via command line.
        const out = await execa("node", [msrBin, "--ignore-packages=packages/c/**,packages/d/**"], {
            cwd,
            env: environment,
            extendEnv: false,
        });

        expect(out.stdout).toMatch("Started multirelease! Loading 2 packages...");
        expect(out.stdout).toMatch("Released 2 of 2 packages, semantically!");
    });
});

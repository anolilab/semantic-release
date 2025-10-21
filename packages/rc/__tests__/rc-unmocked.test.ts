import { rm } from "node:fs/promises";
import { env } from "node:process";

import { writeJsonSync } from "@visulima/fs";
import { join } from "@visulima/path";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rc } from "../src";

const mocks = vi.hoisted(() => {
    // eslint-disable-next-line vitest/require-mock-type-parameters
    return { mockedCwd: vi.fn(), mockedFindUpSync: vi.fn(), mockedHomeDir: vi.fn(), mockedIsAccessibleSync: vi.fn(), mockedReadFileSync: vi.fn() };
});

vi.mock(import("node:os"), () => {
    return {
        homedir: mocks.mockedHomeDir,
    };
});

vi.mock(import("node:process"), async () => {
    const actual = await vi.importActual("node:process");

    return {
        ...actual,
        cwd: mocks.mockedCwd,
    };
});

describe("rc-unmocked", () => {
    let cwdPath: string;
    let homePath: string;

    const npmEnvironment: Record<keyof typeof env, string | undefined> = {};

    beforeEach(async () => {
        cwdPath = temporaryDirectory();
        homePath = temporaryDirectory();

        mocks.mockedCwd.mockReturnValue(cwdPath);
        mocks.mockedHomeDir.mockReturnValue(homePath);

        // eslint-disable-next-line no-restricted-syntax
        for (const key in env) {
            if (key.startsWith("npm_")) {
                npmEnvironment[key as keyof typeof env] = env[key];
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete env[key];
            }
        }
    });

    afterEach(async () => {
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

        mocks.mockedCwd.mockReturnValue(join(cwdPath, "grandparent", "parent", "cwd"));

        expect(rc("bem")).toStrictEqual({
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
            }),
        ).toStrictEqual({
            config: {
                test: 0,
            },
            files: files.map((file) => join(cwdPath, file)).toReversed(),
        });
    });
});

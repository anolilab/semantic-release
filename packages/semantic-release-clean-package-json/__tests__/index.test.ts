import { rm } from "node:fs/promises";

import { readJson, writeJson } from "@visulima/fs";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publish } from "../src";
import type { PublishContext } from "../src/definitions/context";

const DEFAULT_PACKAGE_JSON = {
    dependencies: {
        lodash: "*",
    },
    devDependencies: {
        webpack: "*",
    },
    eslintConfig: {
        extends: "@pvtnbr",
    },
    name: "test-package",
    scripts: {
        postinstall: "echo postinstall",
        test: "echo test",
    },
};

const context: Partial<PublishContext> = {
    branch: {
        name: "foo",
    },
    env: {},
    lastRelease: {
        gitHead: "foo",
        gitTag: "v1.0.0",
        version: "1.0.0",
    },
    logger: {
        error: vi.fn(),
        log: vi.fn(),
        success: vi.fn(),
    },
    nextRelease: {
        gitHead: "foo",
        gitTag: "2.0.0",
        type: "major" as const,
        version: "2.0.0",
    },
};

describe("semantic-release-clean-package-json", () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = temporaryDirectory();
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true });
    });

    it("should removes unnecessary properties", async () => {
        expect.assertions(1);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

        await publish({}, { cwd: temporaryDirectoryPath, ...context } as PublishContext);

        await expect(readJson(packageJsonPath)).resolves.toStrictEqual({
            dependencies: {
                lodash: "*",
            },
            name: "test-package",
            scripts: {
                postinstall: "echo postinstall",
            },
        });
    });

    it("should keep flag from given config", async () => {
        expect.assertions(1);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

        await publish(
            {
                keep: ["eslintConfig", "devDependencies"],
            },
            { cwd: temporaryDirectoryPath, ...context } as PublishContext,
        );

        await expect(readJson(packageJsonPath)).resolves.toStrictEqual({
            dependencies: {
                lodash: "*",
            },
            devDependencies: {
                webpack: "*",
            },
            eslintConfig: {
                extends: "@pvtnbr",
            },
            name: "test-package",
            scripts: {
                postinstall: "echo postinstall",
            },
        });
    });
});

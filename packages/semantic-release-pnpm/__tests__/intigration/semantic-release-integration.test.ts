import { rm } from "node:fs/promises";

import { writeJson } from "@visulima/fs";
import { join } from "@visulima/path";
import { WritableStreamBuffer } from "stream-buffers";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authEnvironment, start, stop, url as npmRegistryUrl } from "./helpers/npm-registry";

// Mock the npm registry helpers to avoid docker setup
vi.mock(import("./helpers/npm-registry"), () => {
    return {
        authEnvironment: {
            npm_config_registry: "http://localhost:4873/",
            NPM_EMAIL: "test@example.com",
            // eslint-disable-next-line sonarjs/no-hardcoded-passwords
            NPM_PASSWORD: "testpass",
            NPM_USERNAME: "testuser",
        },
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        url: "http://localhost:4873/",
    };
});

describe("semantic-release-integration", () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = temporaryDirectory();
        await start();
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });
        await stop();
    });

    it("should skip npm auth verification if \"npmPublish\" is false", async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "package.json"), {
            name: "published",
            publishConfig: { registry: npmRegistryUrl },
            version: "1.0.0",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                { npmPublish: false },
                {
                    cwd,
                    env: { NPM_TOKEN: "wrong_token" },
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: {},
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).resolves.not.toThrow();
    });

    it("should skip npm auth verification if \"package.private\" is true", async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "package.json"), {
            name: "published",
            private: true,
            publishConfig: { registry: npmRegistryUrl },
            version: "1.0.0",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                { npmPublish: false },
                {
                    cwd,
                    env: {},
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: { publish: ["@semantic-release/npm"] },
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).resolves.not.toThrow();
    });

    it("should skip npm token verification if \"package.private\" is true", async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "package.json"), {
            name: "published",
            private: true,
            publishConfig: { registry: npmRegistryUrl },
            version: "1.0.0",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                {},
                {
                    cwd,
                    env: {},
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: { publish: ["@semantic-release/npm"] },
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).resolves.not.toThrow();
    });

    it.skip("should throw error if NPM token is invalid when targeting the default registry", async () => {
        expect.assertions(3);

        await writeJson(join(cwd, "package.json"), {
            name: "published",
            publishConfig: { registry: npmRegistryUrl },
            version: "1.0.0",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                {},
                {
                    cwd,
                    env: { DEFAULT_NPM_REGISTRY: npmRegistryUrl, NPM_TOKEN: "wrong_token" },
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: {},
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).rejects.toThrow("Invalid npm authentication");
    });

    it.skip("should throw error if NPM token is not provided when targeting the default registry", async () => {
        expect.assertions(3);

        await writeJson(join(cwd, "package.json"), {
            name: "published",
            publishConfig: { registry: npmRegistryUrl },
            version: "1.0.0",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                {},
                {
                    cwd,
                    env: { DEFAULT_NPM_REGISTRY: npmRegistryUrl },
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: {},
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).rejects.toThrow("No npm token specified");
    });

    it("should verify npm auth and package", async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "package.json"), {
            name: "valid-token",
            publishConfig: { registry: npmRegistryUrl },
            version: "0.0.0-dev",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                {},
                {
                    cwd,
                    env: authEnvironment,
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: {},
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).resolves.not.toThrow();
    });

    it("should verify npm auth and package from a sub-directory", async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "dist/package.json"), {
            name: "valid-token",
            publishConfig: { registry: npmRegistryUrl },
            version: "0.0.0-dev",
        });

        const { verifyConditions } = await import("../../src");

        await expect(
            verifyConditions(
                { pkgRoot: "dist" },
                {
                    cwd,
                    env: authEnvironment,
                    logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
                    options: {},
                    stderr: new WritableStreamBuffer(),
                    stdout: new WritableStreamBuffer(),
                },
            ),
        ).resolves.not.toThrow();
    });
});

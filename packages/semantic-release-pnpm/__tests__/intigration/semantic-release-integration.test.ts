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

// Mock execa to avoid actual command execution (following semantic-release/npm pattern)
vi.mock(import("execa"));

const { execa } = await import("execa");

describe("semantic-release-integration", () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = temporaryDirectory();
        await start();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });
        await stop();
    });

    it('should skip npm auth verification if "npmPublish" is false', async () => {
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

    it('should skip npm auth verification if "package.private" is true', async () => {
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

    it('should skip npm token verification if "package.private" is true', async () => {
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

    it("should throw error if NPM token is invalid when targeting the default registry", async () => {
        expect.assertions(1);

        await writeJson(join(cwd, "package.json"), {
            name: "published",
            publishConfig: { registry: npmRegistryUrl },
            version: "1.0.0",
        });

        // Mock execa to reject with stderr containing auth error (simulating auth failure for custom registry)
        const authError = new Error("Authentication failed");

        (authError as { stderr?: string }).stderr = "This command requires you to be logged in to http://localhost:4873/";
        vi.mocked(execa).mockRejectedValue(authError);

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

    it("should throw error if NPM token is not provided when targeting the default registry", async () => {
        expect.assertions(1);

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

        // Mock execa to resolve successfully (simulating successful auth for custom registry)
        vi.mocked(execa).mockResolvedValue({
            stderr: "",
            stdout: "",
        } as Awaited<ReturnType<typeof execa>>);

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

        // Mock execa to resolve successfully (simulating successful auth for custom registry)
        vi.mocked(execa).mockResolvedValue({
            stderr: "",
            stdout: "",
        } as Awaited<ReturnType<typeof execa>>);

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

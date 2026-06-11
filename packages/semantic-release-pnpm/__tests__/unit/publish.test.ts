// eslint-disable-next-line e18e/ban-dependencies
import { WritableStreamBuffer } from "stream-buffers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublishContext } from "../../src/definitions/context";
import type { PluginConfig } from "../../src/definitions/plugin-config";
import publish from "../../src/publish";

vi.mock(import("../../src/utils/get-registry"));
vi.mock(import("../../src/utils/get-channel"));
vi.mock(import("../../src/utils/get-release-info"));
vi.mock(import("../../src/utils/should-publish"));
// Keep ExecaError real so instanceof checks in publish.ts work correctly.

// eslint-disable-next-line e18e/ban-dependencies
vi.mock(import("execa"), async (importOriginal) => {
    const actual = await importOriginal<typeof import("execa")>();

    return { ...actual, execa: vi.fn() };
});

const { default: getRegistry } = await import("../../src/utils/get-registry");
const { default: getChannel } = await import("../../src/utils/get-channel");
const { getReleaseInfo } = await import("../../src/utils/get-release-info");
const { shouldPublish } = await import("../../src/utils/should-publish");
// eslint-disable-next-line e18e/ban-dependencies
const { execa, ExecaError } = await import("execa");

const mockExecaResult = <T>(outcome: Promise<T>) =>
    Object.assign(outcome, { stderr: { pipe: vi.fn() }, stdout: { pipe: vi.fn() } }) as ReturnType<typeof execa>;

const logSpy = vi.fn();
const logger = { error: vi.fn(), log: logSpy, success: vi.fn() };

describe(publish, () => {
    const pluginConfig: PluginConfig = {};
    const packageJson = { name: "test-package", version: "1.0.0" };

    const context: PublishContext = {
        branch: { name: "main" },
        branches: [{ name: "main" }],
        cwd: "/test/directory",
        env: {},
        logger,
        nextRelease: { channel: undefined, version: "1.0.0" },
        options: {},
        stderr: new WritableStreamBuffer(),
        stdout: new WritableStreamBuffer(),
    };

    const releaseInfo = { channel: "latest", name: "test-package@1.0.0", url: "https://example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(shouldPublish).mockReturnValue(true);
        vi.mocked(getRegistry).mockReturnValue("https://registry.npmjs.org");
        vi.mocked(getChannel).mockReturnValue("latest");
        vi.mocked(getReleaseInfo).mockReturnValue(releaseInfo);

        vi.mocked(execa).mockReturnValue(mockExecaResult(Promise.resolve({ stdout: "main" })));
    });

    it("should return release info when publish succeeds", async () => {
        expect.assertions(1);

        // execa mock calls git first, then pnpm
        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.resolve({ stdout: "main" })));
        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.resolve()));

        const result = await publish(pluginConfig, packageJson, context);

        expect(result).toStrictEqual(releaseInfo);
    });

    it("should return release info and skip re-publishing when the version is already published", async () => {
        expect.assertions(2);

        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.resolve({ stdout: "main" })));

        // Prototype swap makes instanceof ExecaError true; extra fields harden against future
        // publish.ts checks on shortMessage / exitCode / failed / stderr.
        const alreadyPublishedError: Error = Object.assign(
            Object.setPrototypeOf(
                new Error("cannot publish over the previously published versions"),
                ExecaError.prototype as object,
            ) as Error,
            { exitCode: 1, failed: true, shortMessage: "cannot publish over the previously published versions", stderr: "" },
        );

        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.reject(alreadyPublishedError)));

        const result = await publish(pluginConfig, packageJson, context);

        expect(result).toStrictEqual(releaseInfo);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("already published"));
    });

    it("should detect already-published when the phrase only appears in stderr", async () => {
        expect.assertions(2);

        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.resolve({ stdout: "main" })));

        const stderrOnlyError: Error = Object.assign(
            Object.setPrototypeOf(new Error("Command failed: pnpm publish"), ExecaError.prototype as object) as Error,
            {
                exitCode: 1,
                failed: true,
                shortMessage: "Command failed: pnpm publish",
                stderr: "npm error code E403\nnpm error 403 cannot publish over the previously published versions",
            },
        );

        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.reject(stderrOnlyError)));

        const result = await publish(pluginConfig, packageJson, context);

        expect(result).toStrictEqual(releaseInfo);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("already published"));
    });

    it("should throw when a plain Error (not ExecaError) contains the already-published phrase", async () => {
        expect.assertions(1);

        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.resolve({ stdout: "main" })));
        vi.mocked(execa).mockReturnValueOnce(
            mockExecaResult(Promise.reject(new Error("cannot publish over the previously published versions"))),
        );

        await expect(publish(pluginConfig, packageJson, context)).rejects.toThrow(AggregateError);
    });

    it("should throw for other publish errors", async () => {
        expect.assertions(1);

        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.resolve({ stdout: "main" })));
        vi.mocked(execa).mockReturnValueOnce(mockExecaResult(Promise.reject(new Error("E403 Forbidden"))));

        await expect(publish(pluginConfig, packageJson, context)).rejects.toThrow(AggregateError);
    });

    it("should return false when publishing is disabled", async () => {
        expect.assertions(1);

        vi.mocked(shouldPublish).mockReturnValue(false);

        const result = await publish(pluginConfig, packageJson, context);

        expect(result).toBe(false);
    });
});

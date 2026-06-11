import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VerifyConditionsContext } from "../../../src/definitions/context";
import type { PluginConfig } from "../../../src/definitions/plugin-config";
import verify from "../../../src/verify/index";

// Mock dependencies
vi.mock(import("../../../src/utils/get-package"));
vi.mock(import("../../../src/utils/should-publish"));
vi.mock(import("../../../src/utils/get-npmrc-path"));
vi.mock(import("../../../src/verify/verify-auth"));
vi.mock(import("../../../src/verify/verify-config"));
vi.mock(import("../../../src/verify/verify-pnpm"));

const { default: getPackage } = await import("../../../src/utils/get-package");
const { shouldPublish } = await import("../../../src/utils/should-publish");
const { default: getNpmrcPath } = await import("../../../src/utils/get-npmrc-path");
const { verifyAuth } = await import("../../../src/verify/verify-auth");
const { default: verifyConfig } = await import("../../../src/verify/verify-config");
const { default: verifyPnpm } = await import("../../../src/verify/verify-pnpm");

describe(verify, () => {
    const pluginConfig: PluginConfig = {};
    const context: VerifyConditionsContext = {
        branch: { name: "main" },
        branches: [{ name: "main" }],
        cwd: "/test/directory",
        env: {},
        logger: { error: vi.fn(), log: vi.fn(), success: vi.fn() },
        options: {},
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        stderr: { write: vi.fn() } as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        stdout: { write: vi.fn() } as any,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifyConfig).mockReturnValue([]);
        vi.mocked(verifyPnpm).mockResolvedValue(undefined);
    });

    it("should log when verifying authentication for a package that should be published", async () => {
        expect.assertions(2);

        const pkg = { name: "test-package", version: "1.0.0" };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(true);
        vi.mocked(getNpmrcPath).mockReturnValue(".npmrc");
        vi.mocked(verifyAuth).mockResolvedValue(undefined);

        await verify(pluginConfig, context);

        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Verifying authentication for package"));
        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("test-package"));
    });

    it("should log when skipping authentication for a package that should not be published", async () => {
        expect.assertions(2);

        const pkg = { name: "test-package", private: true, version: "1.0.0" };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(false);

        await verify(pluginConfig, context);

        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Skipping authentication verification"));
        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("publishing disabled"));
    });

    it("should not log authentication messages when package should not be published", async () => {
        expect.assertions(1);

        const pkg = { name: "test-package", private: true, version: "1.0.0" };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(false);

        await verify(pluginConfig, context);

        expect(verifyAuth).not.toHaveBeenCalled();
    });

    it("should handle a plain Error thrown by verifyPnpm without crashing", async () => {
        expect.assertions(2);

        const plainError = new Error("pnpm not found");

        vi.mocked(verifyPnpm).mockImplementation(() => {
            throw plainError;
        });

        const pkg = { name: "test-package", private: true, version: "1.0.0" };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(false);

        const error = await verify(pluginConfig, context).catch((error_: unknown) => error_);

        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toContain(plainError);
    });

    it("should handle a plain Error thrown by verifyAuth without crashing", async () => {
        expect.assertions(2);

        const plainError = new Error("EINVALIDNPMTOKEN Invalid npm token.");

        const pkg = { name: "test-package", version: "1.0.0" };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(true);
        vi.mocked(getNpmrcPath).mockReturnValue(".npmrc");
        vi.mocked(verifyAuth).mockRejectedValue(plainError);

        const error = await verify(pluginConfig, context).catch((error_: unknown) => error_);

        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toContain(plainError);
    });

    it("should handle an Error whose 'errors' property is not an array", async () => {
        expect.assertions(2);

        const malformedError = Object.assign(new Error("malformed aggregate"), { errors: "not an array" });

        vi.mocked(verifyPnpm).mockImplementation(() => {
            throw malformedError;
        });

        const pkg = { name: "test-package", private: true, version: "1.0.0" };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(false);

        const error = await verify(pluginConfig, context).catch((error_: unknown) => error_);

        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toContain(malformedError);
    });
});

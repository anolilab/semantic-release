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
const { default: verifyAuth } = await import("../../../src/verify/verify-auth");
const { default: verifyConfig } = await import("../../../src/verify/verify-config");
const { default: verifyPnpm } = await import("../../../src/verify/verify-pnpm");

describe("verify", () => {
    const pluginConfig: PluginConfig = {};
    const context: VerifyConditionsContext = {
        branch: { name: "main" },
        branches: [{ name: "main" }],
        cwd: "/test/directory",
        env: {},
        logger: { log: vi.fn(), error: vi.fn(), success: vi.fn() },
        options: {},
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        stderr: { write: vi.fn() } as unknown as WritableStream,
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        stdout: { write: vi.fn() } as unknown as WritableStream,
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

        const pkg = { name: "test-package", version: "1.0.0", private: true };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(false);

        await verify(pluginConfig, context);

        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Skipping authentication verification"));
        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("publishing disabled"));
    });

    it("should not log authentication messages when package should not be published", async () => {
        expect.assertions(1);

        const pkg = { name: "test-package", version: "1.0.0", private: true };

        vi.mocked(getPackage).mockResolvedValue(pkg);
        vi.mocked(shouldPublish).mockReturnValue(false);

        await verify(pluginConfig, context);

        expect(verifyAuth).not.toHaveBeenCalled();
    });
});


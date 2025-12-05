import { beforeEach, describe, expect, it, vi } from "vitest";

import { OFFICIAL_REGISTRY } from "../../../src/definitions/constants";
import type { CommonContext } from "../../../src/definitions/context";
import verifyAuth from "../../../src/verify/verify-auth";

// Mock dependencies
vi.mock(import("execa"));
vi.mock(import("../../../src/utils/get-registry"));
vi.mock(import("../../../src/utils/set-npmrc-auth"));
vi.mock(import("../../../src/trusted-publishing/oidc-context"));

const { execa } = await import("execa");
const { default: getRegistry } = await import("../../../src/utils/get-registry");
const { default: setNpmrcAuth } = await import("../../../src/utils/set-npmrc-auth");
const { default: oidcContextEstablished } = await import("../../../src/trusted-publishing/oidc-context");

describe(verifyAuth, () => {
    const npmrc = "npmrc contents";
    const pkg = { name: "test-package", version: "1.0.0" };
    const context: CommonContext = {
        cwd: "/test/directory",
        env: { DEFAULT_NPM_REGISTRY: OFFICIAL_REGISTRY, NPM_TOKEN: "test_token_1234567890" },
        logger: { log: vi.fn() },
        options: {},
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        stderr: { pipe: vi.fn(), write: vi.fn() } as unknown as WritableStream,
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        stdout: { pipe: vi.fn(), write: vi.fn() } as unknown as WritableStream,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should skip authentication when OIDC context is established for official registry", async () => {
        expect.assertions(2);

        vi.mocked(getRegistry).mockReturnValue(OFFICIAL_REGISTRY);
        vi.mocked(oidcContextEstablished).mockResolvedValue(true);

        await verifyAuth(npmrc, pkg, context);

        expect(oidcContextEstablished).toHaveBeenCalledWith(OFFICIAL_REGISTRY, pkg, context);
        expect(setNpmrcAuth).not.toHaveBeenCalled();
    });

    it("should verify token auth when OIDC context is not established for official registry", async () => {
        expect.assertions(4);

        vi.mocked(getRegistry).mockReturnValue(OFFICIAL_REGISTRY);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);

        vi.mocked(execa).mockRejectedValue(new Error("Authentication failed"));

        await expect(verifyAuth(npmrc, pkg, context)).rejects.toThrow("Invalid npm token");
        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Running \"pnpm whoami\" to verify authentication"));
        expect(oidcContextEstablished).toHaveBeenCalledWith(OFFICIAL_REGISTRY, pkg, context);
        expect(setNpmrcAuth).toHaveBeenCalledWith(npmrc, OFFICIAL_REGISTRY, context);
    });

    it("should perform dry-run publish for custom registries", async () => {
        expect.assertions(4);

        const customRegistry = "https://custom.registry.org/";

        vi.mocked(getRegistry).mockReturnValue(customRegistry);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);

        vi.mocked(execa).mockResolvedValue({ stderr: "some output", stdout: "" });

        await verifyAuth(npmrc, pkg, context, "/dist");

        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Running \"pnpm publish --dry-run\" to verify authentication"));
        expect(oidcContextEstablished).toHaveBeenCalledWith(customRegistry, pkg, context);
        expect(setNpmrcAuth).toHaveBeenCalledWith(npmrc, customRegistry, context);
        expect(execa).toHaveBeenCalledWith("pnpm", ["publish", "/dist", "--dry-run", "--tag=semantic-release-auth-check", "--registry", customRegistry], {
            cwd: context.cwd,
            env: {
                ...context.env,
                NPM_CONFIG_USERCONFIG: npmrc,
            },
            preferLocal: true,
            timeout: 5000,
        });
    });

    it("should perform dry-run publish for custom registries from a sub-directory", async () => {
        expect.assertions(3);

        const customRegistry = "https://custom.registry.org/";
        const pkgRoot = "/dist";

        vi.mocked(getRegistry).mockReturnValue(customRegistry);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);

        vi.mocked(execa).mockResolvedValue({ stderr: "some output", stdout: "" });

        await verifyAuth(npmrc, pkg, context, pkgRoot);

        expect(oidcContextEstablished).toHaveBeenCalledWith(customRegistry, pkg, context);
        expect(setNpmrcAuth).toHaveBeenCalledWith(npmrc, customRegistry, context);
        expect(execa).toHaveBeenCalledWith("pnpm", ["publish", "/dist", "--dry-run", "--tag=semantic-release-auth-check", "--registry", customRegistry], {
            cwd: context.cwd,
            env: {
                ...context.env,
                NPM_CONFIG_USERCONFIG: npmrc,
            },
            preferLocal: true,
            timeout: 5000,
        });
    });

    it("should throw error when dry-run publish fails with auth error for custom registry", async () => {
        expect.assertions(3);

        const customRegistry = "https://custom.registry.org/";

        vi.mocked(getRegistry).mockReturnValue(customRegistry);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);

        vi.mocked(execa).mockResolvedValue({ stderr: "This command requires you to be logged in to https://custom.registry.org/", stdout: "" });

        await expect(verifyAuth(npmrc, pkg, context)).rejects.toThrow("Invalid npm authentication");
        expect(oidcContextEstablished).toHaveBeenCalledWith(customRegistry, pkg, context);
        expect(setNpmrcAuth).toHaveBeenCalledWith(npmrc, customRegistry, context);
    });

    it("should verify auth when package name is missing", async () => {
        expect.assertions(2);

        const pkgWithoutName = { version: "1.0.0" };

        vi.mocked(getRegistry).mockReturnValue(OFFICIAL_REGISTRY);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);
        vi.mocked(execa).mockRejectedValue(new Error("Authentication failed"));

        await expect(verifyAuth(npmrc, pkgWithoutName, context)).rejects.toThrow("Invalid npm token");
        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Running \"pnpm whoami\" to verify authentication"));
    });

    it("should bubble through errors from setting up auth", async () => {
        expect.assertions(3);

        const registry = OFFICIAL_REGISTRY;
        const thrownError = new Error("Auth setup failed");

        vi.mocked(getRegistry).mockReturnValue(registry);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockRejectedValue(thrownError);

        await expect(verifyAuth(npmrc, pkg, context)).rejects.toThrow(thrownError);
        expect(oidcContextEstablished).toHaveBeenCalledWith(registry, pkg, context);
        expect(setNpmrcAuth).toHaveBeenCalledWith(npmrc, registry, context);
    });

    it("should cache whoami results for the same registry and token", async () => {
        expect.assertions(3);

        vi.mocked(getRegistry).mockReturnValue(OFFICIAL_REGISTRY);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);
        vi.mocked(execa).mockResolvedValue({ stderr: "", stdout: "test-user" });

        // First call - should execute whoami
        await verifyAuth(npmrc, pkg, context);

        expect(execa).toHaveBeenCalledTimes(1);
        expect(context.logger.log).toHaveBeenCalledWith(expect.stringContaining("Running \"pnpm whoami\""));

        // Second call with same registry/token - should use cache
        vi.clearAllMocks();
        vi.mocked(getRegistry).mockReturnValue(OFFICIAL_REGISTRY);
        vi.mocked(oidcContextEstablished).mockResolvedValue(false);
        vi.mocked(setNpmrcAuth).mockResolvedValue(undefined);
        vi.mocked(execa).mockResolvedValue({ stderr: "", stdout: "test-user" });

        await verifyAuth(npmrc, pkg, context);

        // execa should not be called again due to caching (call count should still be 0 after clearAllMocks)
        expect(execa).not.toHaveBeenCalled();
    });
});

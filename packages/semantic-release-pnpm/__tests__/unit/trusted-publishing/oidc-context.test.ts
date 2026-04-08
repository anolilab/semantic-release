import { beforeEach, describe, expect, it, vi } from "vitest";

import oidcContextEstablished from "../../../src/trusted-publishing/oidc-context";

// Mock the token-exchange module
vi.mock(import("../../../src/trusted-publishing/token-exchange"), () => {
    return {
        default: vi.fn(),
    };
});

const { default: exchangeToken } = await import("../../../src/trusted-publishing/token-exchange");

describe(oidcContextEstablished, () => {
    const pkg = { name: "@scope/package" };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const context = { logger: { log: vi.fn() } } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return true when OIDC context is established for official registry", async () => {
        expect.assertions(2);

        vi.mocked(exchangeToken).mockResolvedValue("token-value");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = await oidcContextEstablished("https://registry.npmjs.org/", pkg, context);

        expect(result).toBe(true);
        expect(exchangeToken).toHaveBeenCalledWith(pkg, context);
    });

    it("should return false when OIDC context is not established for official registry", async () => {
        expect.assertions(2);

        vi.mocked(exchangeToken).mockResolvedValue(undefined);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = await oidcContextEstablished("https://registry.npmjs.org/", pkg, context);

        expect(result).toBe(false);
        expect(exchangeToken).toHaveBeenCalledWith(pkg, context);
    });

    it("should return false when registry is not the official registry", async () => {
        expect.assertions(1);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = await oidcContextEstablished("https://custom.registry.org/", pkg, context);

        expect(result).toBe(false);
    });

    it("should return true when registry URL has different format but same registry", async () => {
        expect.assertions(2);

        vi.mocked(exchangeToken).mockResolvedValue("token-value");

        // Test with registry URL without trailing slash
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = await oidcContextEstablished("https://registry.npmjs.org", pkg, context);

        expect(result).toBe(true);
        expect(exchangeToken).toHaveBeenCalledWith(pkg, context);
    });

    it("should return false when exchangeToken throws an error", async () => {
        expect.assertions(1);

        const error = new Error("Token exchange failed");

        vi.mocked(exchangeToken).mockRejectedValue(error);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = await oidcContextEstablished("https://registry.npmjs.org/", pkg, context);

        expect(result).toBe(false);
    });
});

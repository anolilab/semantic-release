import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import exchangeToken from "../../../src/trusted-publishing/token-exchange";

// Mock external dependencies
vi.mock(import("env-ci"), () => {
    return {
        default: vi.fn(),
    };
});

vi.mock(import("@actions/core"), () => {
    return {
        getIDToken: vi.fn(),
    };
});

const { default: envCi } = await import("env-ci");
const { getIDToken } = await import("@actions/core");

// Mock fetch globally
const mockFetch = vi.fn();

globalThis.fetch = mockFetch;

describe(exchangeToken, () => {
    const packageName = "@scope/some-package";
    const pkg = { name: packageName };
    const logger = { error: vi.fn(), log: vi.fn(), success: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.NPM_ID_TOKEN;
    });

    describe("gitHub Actions", () => {
        const githubProviderName = "GitHub Actions";

        it("should return an access token when token exchange succeeds on GitHub Actions", async () => {
            expect.assertions(3);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: githubProviderName } as any);
            vi.mocked(getIDToken).mockResolvedValue("id-token-value");

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBe("access-token-value");
            expect(getIDToken).toHaveBeenCalledWith("npm:registry.npmjs.org");
            expect(mockFetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/%40scope%2Fsome-package", {
                headers: { Authorization: "Bearer id-token-value" },
                method: "POST",
            });
        });

        it("should return undefined when ID token retrieval fails on GitHub Actions", async () => {
            expect.assertions(1);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: githubProviderName } as any);
            vi.mocked(getIDToken).mockRejectedValue(new Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable"));

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBeUndefined();
        });

        it("should return undefined when token exchange fails on GitHub Actions", async () => {
            expect.assertions(2);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: githubProviderName } as any);
            vi.mocked(getIDToken).mockResolvedValue("id-token-value");

            const mockResponse = {
                json: () => Promise.resolve({ message: "Unauthorized" }),
                ok: false,
                status: 401,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBeUndefined();
            expect(getIDToken).toHaveBeenCalledWith("npm:registry.npmjs.org");
        });
    });

    describe("nPM_ID_TOKEN (generic trusted publishing)", () => {
        it("should return an access token when token exchange succeeds via NPM_ID_TOKEN", async () => {
            expect.assertions(2);

            process.env.NPM_ID_TOKEN = "generic-id-token-value";
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: "CircleCI" } as any);

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBe("access-token-value");
            expect(mockFetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/%40scope%2Fsome-package", {
                headers: { Authorization: "Bearer generic-id-token-value" },
                method: "POST",
            });
        });

        it("should return undefined when token exchange fails via NPM_ID_TOKEN", async () => {
            expect.assertions(1);

            process.env.NPM_ID_TOKEN = "generic-id-token-value";
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: "GitLab CI/CD" } as any);

            const mockResponse = {
                json: () => Promise.resolve({ message: "Unauthorized" }),
                ok: false,
                status: 401,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBeUndefined();
        });

        it("should take priority over GitHub Actions OIDC when NPM_ID_TOKEN is set", async () => {
            expect.assertions(3);

            process.env.NPM_ID_TOKEN = "explicit-id-token-value";
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: "GitHub Actions" } as any);

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBe("access-token-value");
            expect(getIDToken).not.toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/%40scope%2Fsome-package", {
                headers: { Authorization: "Bearer explicit-id-token-value" },
                method: "POST",
            });
        });

        it("should work on unknown CI providers when NPM_ID_TOKEN is set", async () => {
            expect.assertions(1);

            process.env.NPM_ID_TOKEN = "generic-id-token-value";
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: "Other Service" } as any);

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBe("access-token-value");
        });
    });

    describe("other CI providers", () => {
        it("should return undefined when no supported CI provider is detected", async () => {
            expect.assertions(1);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: "Other Service" } as any);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBeUndefined();
        });

        it("should return undefined when CI provider cannot be detected", async () => {
            expect.assertions(1);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({} as any);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBeUndefined();
        });

        it("should return undefined when package name is invalid", async () => {
            expect.assertions(1);

            const invalidPkg = { name: "" };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(invalidPkg, { logger } as any);

            expect(result).toBeUndefined();
        });

        it("should return access token when token exchange succeeds", async () => {
            expect.assertions(1);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            vi.mocked(envCi).mockReturnValue({ name: "GitHub Actions" } as any);
            vi.mocked(getIDToken).mockResolvedValue("id-token-value");

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const result = await exchangeToken(pkg, { logger } as any);

            expect(result).toBe("access-token-value");
        });
    });
});

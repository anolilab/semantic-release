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

            vi.mocked(envCi).mockReturnValue({ name: githubProviderName });
            vi.mocked(getIDToken).mockResolvedValue("id-token-value");

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBe("access-token-value");
            expect(getIDToken).toHaveBeenCalledWith("npm:registry.npmjs.org");
            expect(mockFetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/%40scope%2Fsome-package", {
                headers: { Authorization: "Bearer id-token-value" },
                method: "POST",
            });
        });

        it("should return undefined when ID token retrieval fails on GitHub Actions", async () => {
            expect.assertions(1);

            vi.mocked(envCi).mockReturnValue({ name: githubProviderName });
            vi.mocked(getIDToken).mockRejectedValue(new Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable"));

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBeUndefined();
        });

        it("should return undefined when token exchange fails on GitHub Actions", async () => {
            expect.assertions(2);

            vi.mocked(envCi).mockReturnValue({ name: githubProviderName });
            vi.mocked(getIDToken).mockResolvedValue("id-token-value");

            const mockResponse = {
                json: () => Promise.resolve({ message: "Unauthorized" }),
                ok: false,
                status: 401,
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBeUndefined();
            expect(getIDToken).toHaveBeenCalledWith("npm:registry.npmjs.org");
        });
    });

    describe("gitLab Pipelines", () => {
        const gitlabProviderName = "GitLab CI/CD";

        it("should return an access token when token exchange succeeds on GitLab Pipelines", async () => {
            expect.assertions(2);

            process.env.NPM_ID_TOKEN = "gitlab-id-token-value";
            vi.mocked(envCi).mockReturnValue({ name: gitlabProviderName });

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBe("access-token-value");
            expect(mockFetch).toHaveBeenCalledWith("https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/%40scope%2Fsome-package", {
                headers: { Authorization: "Bearer gitlab-id-token-value" },
                method: "POST",
            });
        });

        it("should return undefined when ID token is not available on GitLab Pipelines", async () => {
            expect.assertions(1);

            vi.mocked(envCi).mockReturnValue({ name: gitlabProviderName });

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBeUndefined();
        });

        it("should return undefined when token exchange fails on GitLab Pipelines", async () => {
            expect.assertions(1);

            process.env.NPM_ID_TOKEN = "gitlab-id-token-value";
            vi.mocked(envCi).mockReturnValue({ name: gitlabProviderName });

            const mockResponse = {
                json: () => Promise.resolve({ message: "Unauthorized" }),
                ok: false,
                status: 401,
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBeUndefined();
        });
    });

    describe("other CI providers", () => {
        it("should return undefined when no supported CI provider is detected", async () => {
            expect.assertions(1);

            vi.mocked(envCi).mockReturnValue({ name: "Other Service" });

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBeUndefined();
        });

        it("should return undefined when CI provider cannot be detected", async () => {
            expect.assertions(1);

            vi.mocked(envCi).mockReturnValue({});

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBeUndefined();
        });

        it("should return undefined when package name is invalid", async () => {
            expect.assertions(1);

            const invalidPkg = { name: "" };

            const result = await exchangeToken(invalidPkg, { logger });

            expect(result).toBeUndefined();
        });

        it("should return access token when token exchange succeeds", async () => {
            expect.assertions(1);

            vi.mocked(envCi).mockReturnValue({ name: "GitHub Actions" });
            vi.mocked(getIDToken).mockResolvedValue("id-token-value");

            const mockResponse = {
                json: () => Promise.resolve({ token: "access-token-value" }),
                ok: true,
            };

            mockFetch.mockResolvedValue(mockResponse);

            const result = await exchangeToken(pkg, { logger });

            expect(result).toBe("access-token-value");
        });
    });
});

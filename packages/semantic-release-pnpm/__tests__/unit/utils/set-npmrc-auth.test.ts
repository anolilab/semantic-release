import { rm } from "node:fs/promises";
import { env } from "node:process";

import { readFile, writeFile } from "@visulima/fs";
import { resolve } from "@visulima/path";
import { temporaryDirectory, temporaryFile } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setNpmrcAuthFilePath = "../../../src/utils/set-npmrc-auth";

const logSpy = vi.fn();
const logger = { log: logSpy };

const homeDirectorySpy = vi.fn();

vi.mock("node:os", () => {
    return {
        homedir: homeDirectorySpy,
    };
});

describe("set-npmrc-auth", () => {
    let cwd: string;
    let home: string;
    const npmEnvironment: Record<keyof typeof env, string | undefined> = {};

    beforeEach(() => {
        cwd = temporaryDirectory();
        home = temporaryDirectory();

        homeDirectorySpy.mockReturnValue(home);

        // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
        for (const key in env) {
            if (key.startsWith("npm_")) {
                // eslint-disable-next-line security/detect-object-injection
                npmEnvironment[key as keyof typeof env] = env[key];
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
                delete env[key];
            }
        }
    });

    afterEach(async () => {
        vi.resetAllMocks();

        // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax,guard-for-in
        for (const key in npmEnvironment) {
            // eslint-disable-next-line security/detect-object-injection
            env[key] = npmEnvironment[key];
        }

        await rm(cwd, { recursive: true });
        await rm(home, { recursive: true });
    });

    it('should set auth with "NPM_TOKEN"', async () => {
        expect.assertions(2);

        const npmrc = temporaryFile({ name: ".npmrc" });

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: { NPM_TOKEN: "npm_token" }, logger });

        expect(logSpy).toHaveBeenCalledWith(`Wrote NPM_TOKEN to ${npmrc}`);

        // eslint-disable-next-line no-template-curly-in-string
        await expect(readFile(npmrc)).resolves.toBe("registry=https://registry.npmjs.org/\n\n//custom.registry.com/:_authToken = ${NPM_TOKEN}");
    });

    it('should set auth with "NPM_USERNAME", "NPM_PASSWORD" and "NPM_EMAIL"', async () => {
        expect.assertions(2);

        const npmrc = temporaryFile({ name: ".npmrc" });

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", {
            cwd,
            env: { NPM_EMAIL: "npm_email", NPM_PASSWORD: "npm_pasword", NPM_USERNAME: "npm_username" },
            logger,
        });

        expect(logSpy).toHaveBeenCalledWith(`Wrote NPM_USERNAME, NPM_PASSWORD, and NPM_EMAIL to ${npmrc}`);

        await expect(readFile(npmrc)).resolves.toBe(`registry=https://registry.npmjs.org/\n\n_auth = \${LEGACY_TOKEN}\nemail = \${NPM_EMAIL}`);
    });

    it('should preserve home ".npmrc"', async () => {
        expect.assertions(3);

        const npmrc = temporaryFile({ name: ".npmrc" });

        await writeFile(resolve(home, ".npmrc"), "home_config = test");

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: { NPM_TOKEN: "npm_token" }, logger });

        expect(logSpy.mock.calls[1]).toStrictEqual(["Reading npm config from %s", [resolve(home, ".npmrc")].join(", ")]);
        expect(logSpy.mock.calls[2]).toStrictEqual([`Wrote NPM_TOKEN to ${npmrc}`]);

        await expect(readFile(npmrc)).resolves.toBe(
            `registry=https://registry.npmjs.org/\nhome_config=test\n\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`,
        );
    });

    it('should preserve home and local ".npmrc"', async () => {
        expect.assertions(3);

        const npmrc = temporaryFile({ name: ".npmrc" });

        await writeFile(resolve(cwd, ".npmrc"), "cwd_config = test");
        await writeFile(resolve(home, ".npmrc"), "home_config = test");

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: { NPM_TOKEN: "npm_token" }, logger });

        expect(logSpy.mock.calls[1]).toStrictEqual(["Reading npm config from %s", [resolve(home, ".npmrc"), resolve(cwd, ".npmrc")].join(", ")]);
        expect(logSpy.mock.calls[2]).toStrictEqual([`Wrote NPM_TOKEN to ${npmrc}`]);

        await expect(readFile(npmrc)).resolves.toBe(
            `registry=https://registry.npmjs.org/\nhome_config=test\ncwd_config=test\n\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`,
        );
    });

    it('should preserve all ".npmrc" if auth is already configured', async () => {
        expect.assertions(2);

        const npmrc = temporaryFile({ name: ".npmrc" });

        await writeFile(resolve(cwd, ".npmrc"), `//custom.registry.com/:_authToken = \${NPM_TOKEN}`);
        await writeFile(resolve(home, ".npmrc"), "home_config = test");

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: {}, logger });

        expect(logSpy.mock.calls[1]).toStrictEqual(["Reading npm config from %s", [resolve(home, ".npmrc"), resolve(cwd, ".npmrc")].join(", ")]);
        await expect(readFile(npmrc)).resolves.toBe(
            `registry=https://registry.npmjs.org/\nhome_config=test\n//custom.registry.com/:_authToken=\${NPM_TOKEN}\n`,
        );
    });

    it('should preserve ".npmrc" if auth is already configured for a scoped package', async () => {
        expect.assertions(2);

        const npmrc = temporaryFile({ name: ".npmrc" });

        await writeFile(resolve(cwd, ".npmrc"), `@scope:registry=http://custom.registry.com\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`);
        await writeFile(resolve(home, ".npmrc"), "home_config = test");

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: {}, logger });

        expect(logSpy.mock.calls[1]).toStrictEqual(["Reading npm config from %s", [resolve(home, ".npmrc"), resolve(cwd, ".npmrc")].join(", ")]);
        await expect(readFile(npmrc)).resolves.toBe(
            `registry=https://registry.npmjs.org/\nhome_config=test\n@scope:registry=http://custom.registry.com\n//custom.registry.com/:_authToken=\${NPM_TOKEN}\n`,
        );
    });

    it('should throw error if "NPM_TOKEN" is missing', async () => {
        expect.assertions(3);

        const npmrc = temporaryFile({ name: ".npmrc" });

        const errorMessage = "No npm token specified.";

        try {
            const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

            await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: {}, logger });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typeError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.name).toBe("AggregateError");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.message).toContain(errorMessage);
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.errors[0].code).toBe("ENONPMTOKEN");
        }
    });

    it('should emulate npm config resolution if "NPM_CONFIG_USERCONFIG" is set', async () => {
        expect.assertions(2);

        const npmrc = temporaryFile({ name: ".npmrc" });

        const customNpmrcPath = resolve(cwd, ".custom-npmrc");
        await writeFile(customNpmrcPath, `//custom.registry.com/:_authToken = \${NPM_TOKEN}`);

        const environment = { NPM_CONFIG_USERCONFIG: customNpmrcPath };

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://custom.registry.com", {
            cwd,
            env: environment,
            logger,
        });

        expect(logSpy.mock.calls[1]).toStrictEqual(["Reading npm config from %s", customNpmrcPath]);
        await expect(readFile(npmrc)).resolves.toBe(`registry=https://registry.npmjs.org/\n//custom.registry.com/:_authToken=\${NPM_TOKEN}\n`);
    });

    it('should throw error if "NPM_USERNAME" is missing', async () => {
        expect.assertions(3);

        const npmrc = temporaryFile({ name: ".npmrc" });
        const environment = { NPM_EMAIL: "npm_email", NPM_PASSWORD: "npm_password" };

        const errorMessage = "No npm token specified.";

        try {
            const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

            await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: environment, logger });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typeError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.name).toBe("AggregateError");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.message).toContain(errorMessage);
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.errors[0].code).toBe("ENONPMTOKEN");
        }
    });

    it('should throw error if "NPM_PASSWORD" is missing', async () => {
        expect.assertions(3);

        const npmrc = temporaryFile({ name: ".npmrc" });
        const environment = { NPM_EMAIL: "npm_email", NPM_USERNAME: "npm_username" };

        const errorMessage = "No npm token specified.";

        try {
            const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

            await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: environment, logger });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typeError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.name).toBe("AggregateError");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.message).toContain(errorMessage);
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.errors[0].code).toBe("ENONPMTOKEN");
        }
    });

    it('should throw error if "NPM_EMAIL" is missing', async () => {
        expect.assertions(3);

        const npmrc = temporaryFile({ name: ".npmrc" });
        const environment = { NPM_PASSWORD: "npm_password", NPM_USERNAME: "npm_username" };

        const errorMessage = "No npm token specified.";

        try {
            const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

            await setNpmrcAuth(npmrc, "http://custom.registry.com", { cwd, env: environment, logger });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typeError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.name).toBe("AggregateError");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.message).toContain(errorMessage);
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.errors[0].code).toBe("ENONPMTOKEN");
        }
    });

    it("prefer .npmrc over environment variables", async () => {
        expect.assertions(4);

        const npmrc = temporaryFile({ name: ".npmrc" });
        // Specify an NPM token environment variable
        const environment = { NPM_TOKEN: "env_npm_token" };

        await writeFile(resolve(cwd, ".npmrc"), "//registry.npmjs.org/:_authToken=npmrc_npm_token");

        const setNpmrcAuth = await import(setNpmrcAuthFilePath).then((m) => m.default);

        await setNpmrcAuth(npmrc, "http://registry.npmjs.org", { cwd, env: environment, logger });

        // Assert that the token from .npmrc is used
        await expect(readFile(npmrc)).resolves.toBe(`registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=npmrc_npm_token\n`);

        // Assert that the log indicates reading from .npmrc
        expect(logSpy.mock.calls[1]).toStrictEqual(["Reading npm config from %s", resolve(cwd, ".npmrc")]);

        // Assert that NPM_TOKEN is not written
        // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
        for (const log of logSpy.mock.calls) {
            expect(log).not.toStrictEqual(expect.stringContaining("Wrote NPM_TOKEN"));
        }
    });
});

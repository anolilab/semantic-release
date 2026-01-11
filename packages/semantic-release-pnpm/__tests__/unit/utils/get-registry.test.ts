import { rm } from "node:fs/promises";

import { writeFile } from "@visulima/fs";
import { resolve } from "@visulima/path";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OFFICIAL_REGISTRY } from "../../../src/definitions/constants";
import getRegistry from "../../../src/utils/get-registry";

describe(getRegistry, () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = temporaryDirectory();
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });
    });

    it("get default registry", () => {
        expect.assertions(2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "package-name" }, { cwd, env: {} } as any)).toBe(OFFICIAL_REGISTRY);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "package-name", publishConfig: {} }, { cwd, env: {} } as any)).toBe(OFFICIAL_REGISTRY);
    });

    it('get the registry configured in ".npmrc" and normalize trailing slash', async () => {
        expect.assertions(1);

        await writeFile(resolve(cwd, ".npmrc"), "registry = https://custom1.registry.com");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "package-name" }, { cwd, env: {} } as any)).toBe("https://custom1.registry.com/");
    });

    it('get the registry configured from "publishConfig"', async () => {
        expect.assertions(1);

        await writeFile(resolve(cwd, ".npmrc"), "registry = https://custom2.registry.com");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "package-name", publishConfig: { registry: "https://custom3.registry.com/" } }, { cwd, env: {} } as any)).toBe(
            "https://custom3.registry.com/",
        );
    });

    it('get the registry configured in "NPM_CONFIG_REGISTRY"', () => {
        expect.assertions(1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "package-name" }, { cwd, env: { NPM_CONFIG_REGISTRY: "https://custom1.registry.com/" } } as any)).toBe(
            "https://custom1.registry.com/",
        );
    });

    it('get the registry configured in ".npmrc" for scoped package', async () => {
        expect.assertions(1);

        await writeFile(resolve(cwd, ".npmrc"), "@scope:registry = https://custom3.registry.com");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "@scope/package-name" }, { cwd, env: {} } as any)).toBe("https://custom3.registry.com/");
    });

    it('get the registry configured via "NPM_CONFIG_USERCONFIG" for scoped package', async () => {
        expect.assertions(1);

        await writeFile(resolve(cwd, ".custom-npmrc"), "@scope:registry = https://custom4.registry.com");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getRegistry({ name: "@scope/package-name" }, { cwd, env: { NPM_CONFIG_USERCONFIG: resolve(cwd, ".custom-npmrc") } } as any)).toBe(
            "https://custom4.registry.com/",
        );
    });

    it('get the registry configured in "publishConfig" for scoped package', async () => {
        expect.assertions(1);

        await writeFile(resolve(cwd, ".npmrc"), "@scope:registry = https://custom3.registry.com\nregistry = https://custom4.registry.com");

        expect(
            getRegistry(
                {
                    name: "@scope/package-name",
                    publishConfig: {
                        "@scope:registry": "https://custom5.registry.com",
                        registry: "https://custom6.registry.com",
                    },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { cwd, env: { NPM_CONFIG_REGISTRY: "https://custom1.registry.com/" } } as any,
            ),
        ).toBe("https://custom5.registry.com/");
    });
});

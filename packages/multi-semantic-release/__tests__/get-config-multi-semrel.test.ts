import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import getConfig from "../src/get-config-multi-semrel";
import { copyDirectory } from "./helpers/file";
import { gitInit } from "./helpers/git";

type Config = {
    debug?: boolean;
    deps: {
        bump: string;
        prefix: string;
        release: string;
    };
    dryRun?: boolean;
    firstParent: boolean;
    ignorePackages: string[];
    ignorePrivate: boolean;
    sequentialInit: boolean;
    sequentialPrepare: boolean;
    tagFormat: string;
};

type CliFlags = {
    debug?: boolean;
    deps?: {
        bump?: string;
        release?: string;
    };
    dryRun?: boolean;
    ignorePackages?: string[];
};

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../__fixtures__");

describe("getConfig()", () => {
    it("default options", async () => {
        expect.assertions(1);

        const result: Config = await getConfig(process.cwd(), {});

        expect(result).toMatchObject({
            debug: false,
            deps: {
                bump: "override",
                prefix: "",
                release: "patch",
            },
            dryRun: undefined,
            firstParent: false,
            ignorePackages: [],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        });
    });

    it("only CLI flags and default options", async () => {
        expect.assertions(1);

        const cliFlags: CliFlags = {
            debug: true,
            deps: {
                bump: "inherit",
            },
            dryRun: false,
            ignorePackages: ["!packages/d/**"],
        };

        const result: Config = await getConfig(process.cwd(), cliFlags);

        expect(result).toMatchObject({
            debug: true,
            deps: {
                bump: "inherit",
                prefix: "",
                release: "patch",
            },
            dryRun: false,
            firstParent: false,
            ignorePackages: ["!packages/d/**"],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        });
    });

    it("package.json config", async () => {
        expect.assertions(1);

        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfig/`, cwd);

        const result: Config = await getConfig(cwd, {});

        expect(result).toMatchObject({
            debug: true,
            deps: {
                bump: "inherit",
                prefix: "",
                release: "patch",
            },
            dryRun: undefined,
            firstParent: false,
            ignorePackages: ["!packages/d/**"],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        });
    });

    it("package.json config and CLI flags", async () => {
        expect.assertions(1);

        const cwd = gitInit();
        const cliFlags: CliFlags = {
            debug: false,
            deps: {
                release: "minor",
            },
            ignorePackages: ["!packages/c/**"],
        };

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfig/`, cwd);

        const result: Config = await getConfig(cwd, cliFlags);

        expect(result).toMatchObject({
            debug: false,
            deps: {
                bump: "inherit",
                prefix: "",
                release: "minor",
            },
            dryRun: undefined,
            firstParent: false,
            ignorePackages: ["!packages/d/**", "!packages/c/**"],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        });
    });

    it("package.json extends", async () => {
        expect.assertions(1);

        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfigExtends/`, cwd);

        const result: Config = await getConfig(cwd, {});

        expect(result).toMatchObject({
            debug: true,
            deps: {
                bump: "satisfy",
                prefix: "",
                release: "patch",
            },
            dryRun: undefined,
            firstParent: false,
            ignorePackages: ["!packages/d/**"],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        });
    });

    it("package.json extends and CLI flags", async () => {
        expect.assertions(1);

        const cwd = gitInit();
        const cliFlags: CliFlags = {
            debug: false,
            deps: {
                release: "minor",
            },
            ignorePackages: ["!packages/c/**"],
        };

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfigExtends/`, cwd);

        const result: Config = await getConfig(cwd, cliFlags);

        expect(result).toMatchObject({
            debug: false,
            deps: {
                bump: "satisfy",
                prefix: "",
                release: "minor",
            },
            dryRun: undefined,
            firstParent: false,
            ignorePackages: ["!packages/d/**", "!packages/c/**"],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        });
    });
});

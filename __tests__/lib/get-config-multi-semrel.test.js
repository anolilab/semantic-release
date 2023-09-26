import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import getConfig from "../../lib/get-config-multi-semrel.js";
import { copyDirectory } from "../helpers/file.js";
import { gitInit } from "../helpers/git.js";

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../__fixtures__");

describe("getConfig()", () => {
    it("default options", async () => {
        const result = await getConfig(process.cwd(), {});

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
        const cliFlags = {
            debug: true,
            deps: {
                bump: "inherit",
            },
            dryRun: false,
            ignorePackages: ["!packages/d/**"],
        };

        const result = await getConfig(process.cwd(), cliFlags);

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
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfig/`, cwd);

        const result = await getConfig(cwd, {});

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
        const cwd = gitInit();
        const cliFlags = {
            debug: false,
            deps: {
                release: "minor",
            },
            ignorePackages: ["!packages/c/**"],
        };

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfig/`, cwd);

        const result = await getConfig(cwd, cliFlags);

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
        const cwd = gitInit();

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfigExtends/`, cwd);

        const result = await getConfig(cwd, {});

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
        const cwd = gitInit();
        const cliFlags = {
            debug: false,
            deps: {
                release: "minor",
            },
            ignorePackages: ["!packages/c/**"],
        };

        copyDirectory(`${fixturesPath}/yarnWorkspacesConfigExtends/`, cwd);

        const result = await getConfig(cwd, cliFlags);

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

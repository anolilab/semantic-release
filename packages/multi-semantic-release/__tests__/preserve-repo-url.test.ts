import { describe, expect, it, vi } from "vitest";

import createInlinePluginCreator from "../src/create-inline-plugin-creator";
import type { Flags, MultiContext, Package, SemanticReleaseContext } from "../src/types";

const PROJECT_DIR = "/workspace/project";
const PACKAGE_DIR = `${PROJECT_DIR}/packages/a`;

const MANIFEST_REPOSITORY_URL = "https://gitlab.example.com/group/project.git";
const CREDENTIALS = ["gitlab-ci-token", "token"].join(":");
const AUTHENTICATED_REPOSITORY_URL = `https://${CREDENTIALS}@gitlab.example.com/group/project.git`;

// eslint-disable-next-line no-template-curly-in-string
const TAG_FORMAT = "a@${version}";

const createPackage = (): Package => {
    return {
        deps: [],
        dir: PACKAGE_DIR,
        localDeps: [],
        manifest: { name: "a", version: "1.0.0" },
        name: "a",
        options: { repositoryUrl: MANIFEST_REPOSITORY_URL, tagFormat: TAG_FORMAT },
        path: `${PACKAGE_DIR}/package.json`,
        plugins: {},
    };
};

const createMultiContext = (): MultiContext => {
    return {
        cwd: PROJECT_DIR,
        env: {},
        globalOptions: {},
        inputOptions: {},
        stderr: process.stderr,
        stdout: process.stdout,
    };
};

const createContext = (): SemanticReleaseContext => {
    return {
        branch: { name: "main" },
        cwd: PROJECT_DIR,
        env: {},
        options: { repositoryUrl: AUTHENTICATED_REPOSITORY_URL },
        stderr: process.stderr,
        stdout: process.stdout,
    };
};

const createInlinePlugin = (npmPackage: Package, flags: Flags = {}) => createInlinePluginCreator([npmPackage], createMultiContext(), flags)(npmPackage);

describe("repository URL preservation", () => {
    it("should keep the authenticated repository URL when the package options are applied", async () => {
        expect.assertions(1);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePlugin(npmPackage);
        const context = createContext();

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.repositoryUrl).toBe(AUTHENTICATED_REPOSITORY_URL);
    });

    it("should keep the authenticated repository URL when package options are nested under _pkgOptions", async () => {
        expect.assertions(1);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePlugin(npmPackage);
        const context = createContext();

        context.options._pkgOptions = { repositoryUrl: MANIFEST_REPOSITORY_URL };

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.repositoryUrl).toBe(AUTHENTICATED_REPOSITORY_URL);
    });

    it("should still apply the remaining package options", async () => {
        expect.assertions(2);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePlugin(npmPackage);
        const context = createContext();

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.tagFormat).toBe(TAG_FORMAT);
        expect(context.cwd).toBe(npmPackage.dir);
    });

    it("should take the package repository URL when semantic-release resolved none", async () => {
        expect.assertions(1);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePlugin(npmPackage);
        const context = createContext();

        context.options = {};

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.repositoryUrl).toBe(MANIFEST_REPOSITORY_URL);
    });

    it("should keep the authenticated repository URL for every step that applies package options", async () => {
        expect.assertions(4);

        const npmPackage = createPackage();
        const verifyConditions = vi.fn();
        const verifyRelease = vi.fn();
        const publish = vi.fn();

        npmPackage.plugins = { publish, verifyConditions, verifyRelease };

        const inlinePlugin = createInlinePlugin(npmPackage);
        // `prepare` is the step that pushes back (@semantic-release/git), so it is the real
        // failure point for #241. Dry-run mode returns right after the options are applied,
        // which keeps the assertion free of manifest and git side effects.
        const dryRunPlugin = createInlinePlugin(npmPackage, { dryRun: true });

        for (const step of [inlinePlugin.verifyConditions, inlinePlugin.verifyRelease, inlinePlugin.publish, dryRunPlugin.prepare]) {
            const context = createContext();

            // eslint-disable-next-line no-await-in-loop
            await step?.(undefined, context);

            expect(context.options.repositoryUrl).toBe(AUTHENTICATED_REPOSITORY_URL);
        }
    });
});

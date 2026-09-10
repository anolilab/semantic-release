import { describe, expect, it, vi } from "vitest";

import createInlinePluginCreator from "../src/create-inline-plugin-creator";
import type { Flags, MultiContext, Package, SemanticReleaseContext } from "../src/types";

const MANIFEST_REPOSITORY_URL = "https://gitlab.example.com/group/project.git";
const CREDENTIALS = ["gitlab-ci-token", "token"].join(":");
const AUTHENTICATED_REPOSITORY_URL = `https://${CREDENTIALS}@gitlab.example.com/group/project.git`;

const createPackage = (): Package => {
    return {
        deps: [],
        dir: "/tmp/project/packages/a",
        localDeps: [],
        manifest: { name: "a", version: "1.0.0" },
        name: "a",
        options: { repositoryUrl: MANIFEST_REPOSITORY_URL, tagFormat: "a@${version}" },
        path: "/tmp/project/packages/a/package.json",
        plugins: {},
    };
};

const createMultiContext = (): MultiContext => {
    return {
        cwd: "/tmp/project",
        env: {},
        globalOptions: {},
        inputOptions: {},
        stderr: process.stderr as NodeJS.WriteStream,
        stdout: process.stdout as NodeJS.WriteStream,
    };
};

const createContext = (): SemanticReleaseContext => {
    return {
        branch: { name: "main" },
        cwd: "/tmp/project",
        env: {},
        options: { repositoryUrl: AUTHENTICATED_REPOSITORY_URL },
        stderr: process.stderr,
        stdout: process.stdout,
    };
};

describe("repository URL preservation", () => {
    it("should keep the authenticated repository URL when the package options are applied", async () => {
        expect.assertions(1);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(), {} as Flags)(npmPackage);
        const context = createContext();

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.repositoryUrl).toBe(AUTHENTICATED_REPOSITORY_URL);
    });

    it("should keep the authenticated repository URL when package options are nested under _pkgOptions", async () => {
        expect.assertions(1);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(), {} as Flags)(npmPackage);
        const context = createContext();

        context.options._pkgOptions = { repositoryUrl: MANIFEST_REPOSITORY_URL };

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.repositoryUrl).toBe(AUTHENTICATED_REPOSITORY_URL);
    });

    it("should still apply the remaining package options", async () => {
        expect.assertions(2);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(), {} as Flags)(npmPackage);
        const context = createContext();

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.tagFormat).toBe("a@${version}");
        expect(context.cwd).toBe(npmPackage.dir);
    });

    it("should take the package repository URL when semantic-release resolved none", async () => {
        expect.assertions(1);

        const npmPackage = createPackage();
        const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(), {} as Flags)(npmPackage);
        const context = createContext();

        context.options = {};

        await inlinePlugin.verifyConditions?.(undefined, context);

        expect(context.options.repositoryUrl).toBe(MANIFEST_REPOSITORY_URL);
    });

    it("should keep the authenticated repository URL for every step that applies package options", async () => {
        expect.assertions(3);

        const npmPackage = createPackage();
        const verifyConditions = vi.fn();
        const verifyRelease = vi.fn();
        const publish = vi.fn();

        npmPackage.plugins = { publish, verifyConditions, verifyRelease };

        const inlinePlugin = createInlinePluginCreator([npmPackage], createMultiContext(), {} as Flags)(npmPackage);

        for (const step of [inlinePlugin.verifyConditions, inlinePlugin.verifyRelease, inlinePlugin.publish]) {
            const context = createContext();

            // eslint-disable-next-line no-await-in-loop
            await step?.(undefined, context);

            expect(context.options.repositoryUrl).toBe(AUTHENTICATED_REPOSITORY_URL);
        }
    });
});

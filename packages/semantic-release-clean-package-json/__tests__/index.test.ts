import { rm } from "node:fs/promises";

import { readJson, writeJson } from "@visulima/fs";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publish, success } from "../src";
import type { CommonContext, PublishContext } from "../src/definitions/context";

const DEFAULT_PACKAGE_JSON = {
    dependencies: {
        lodash: "*",
    },
    devDependencies: {
        webpack: "*",
    },
    eslintConfig: {
        extends: "@pvtnbr",
    },
    name: "test-package",
    scripts: {
        postinstall: "echo postinstall",
        test: "echo test",
    },
    version: "1.0.0",
};

const context: Partial<PublishContext> = {
    branch: {
        name: "foo",
    },
    env: {},
    lastRelease: {
        gitHead: "foo",
        gitTag: "v1.0.0",
        version: "1.0.0",
    },
    logger: {
        error: vi.fn(),
        log: vi.fn(),
        success: vi.fn(),
    },
    nextRelease: {
        gitHead: "foo",
        gitTag: "2.0.0",
        type: "major" as const,
        version: "2.0.0",
    },
};

describe("semantic-release-clean-package-json", () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = temporaryDirectory();
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true });

        vi.resetAllMocks();
    });

    it("should removes unnecessary properties", async () => {
        expect.assertions(4);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

        await publish({}, { cwd: temporaryDirectoryPath, ...context } as PublishContext);

        await expect(readJson(packageJsonPath)).resolves.toStrictEqual({
            dependencies: {
                lodash: "*",
            },
            name: "test-package",
            scripts: {
                postinstall: "echo postinstall",
            },
            version: "1.0.0",
        });
        expect((context as PublishContext).logger.log).toHaveBeenCalledWith("Created a backup of the package.json file.");
        expect((context as PublishContext).logger.log).toHaveBeenCalledWith("Removing property \"devDependencies\"");
        expect((context as PublishContext).logger.log).toHaveBeenCalledWith("Removing property \"eslintConfig\"");
    });

    it("should keep flag from given config", async () => {
        expect.assertions(3);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

        await publish(
            {
                keep: ["eslintConfig", "devDependencies"],
            },
            { cwd: temporaryDirectoryPath, ...context } as PublishContext,
        );

        await expect(readJson(packageJsonPath)).resolves.toStrictEqual({
            dependencies: {
                lodash: "*",
            },
            devDependencies: {
                webpack: "*",
            },
            eslintConfig: {
                extends: "@pvtnbr",
            },
            name: "test-package",
            scripts: {
                postinstall: "echo postinstall",
            },
            version: "1.0.0",
        });
        expect((context as PublishContext).logger.log).toHaveBeenCalledWith("Created a backup of the package.json file.");
        expect((context as PublishContext).logger.log).toHaveBeenCalledWith(
            "Keeping the following properties: name, version, private, publishConfig, scripts.preinstall, scripts.install, scripts.postinstall, scripts.dependencies, files, bin, browser, main, man, jsdelivr, unpkg, dependencies, peerDependencies, peerDependenciesMeta, bundledDependencies, optionalDependencies, engines, os, cpu, description, keywords, author, contributors, license, homepage, repository, bugs, funding, type, exports, imports, sponsor, publisher, displayName, categories, galleryBanner, preview, contributes, activationEvents, badges, markdown, qna, extensionPack, extensionDependencies, extensionKind, icon, fesm2020, fesm2015, esm2020, es2020, types, typings, typesVersions, module, sideEffects, eslintConfig, devDependencies",
        );
    });

    describe(success, () => {
        it("should restore package.json from backup and update version", async () => {
            expect.assertions(3);

            const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

            // Create and write initial package.json
            await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

            // Run publish to create backup and modify package.json
            await publish({}, { cwd: temporaryDirectoryPath, ...context } as PublishContext);

            // Run success to restore from backup
            await success({}, { ...context, cwd: temporaryDirectoryPath } as CommonContext);

            // Verify the restored package.json
            const restoredPackageJson = await readJson(packageJsonPath);

            expect(restoredPackageJson).toStrictEqual(DEFAULT_PACKAGE_JSON); // This is just mocked without the pnpm or npm semantic-release plugin

            expect((context as PublishContext).logger.log).toHaveBeenCalledWith("Restored modified package.json from backup.");
            expect((context as PublishContext).logger.error).not.toHaveBeenCalled();
        });

        it("should log error when backup file is not found", async () => {
            expect.assertions(2);

            // Run success without creating backup first
            await success({}, { cwd: temporaryDirectoryPath, ...context } as CommonContext);

            expect((context as PublishContext).logger.error).toHaveBeenCalledWith("No backup package.json found.");
            expect((context as PublishContext).logger.log).not.toHaveBeenCalledWith("Restored modified package.json from backup.");
        });

        it("should handle custom pkgRoot", async () => {
            expect.assertions(3);

            const customRoot = `${temporaryDirectoryPath}/dist`;
            const packageJsonPath = `${customRoot}/package.json`;

            // Create custom directory and package.json
            await rm(customRoot, { force: true, recursive: true });
            await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

            // Run publish with custom pkgRoot
            await publish({ pkgRoot: "dist" }, { cwd: temporaryDirectoryPath, ...context } as PublishContext);

            // Run success with custom pkgRoot
            await success({ pkgRoot: "dist" }, { cwd: temporaryDirectoryPath, ...context } as CommonContext);

            // Verify the restored package.json
            const restoredPackageJson = await readJson(packageJsonPath);

            expect(restoredPackageJson).toStrictEqual(DEFAULT_PACKAGE_JSON); // This is just mocked without the pnpm or npm semantic-release plugin

            expect((context as PublishContext).logger.log).toHaveBeenCalledWith("Restored modified package.json from backup.");
            expect((context as PublishContext).logger.error).not.toHaveBeenCalled();
        });
    });
});

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stderr, stdout } from "node:process";

import { readFile, readJson, writeFile, writeJson } from "@visulima/fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publish, success } from "../src";
import type { PublishContext } from "../src/definitions/context";

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

const logger = {
    error: vi.fn(),
    log: vi.fn(),
    success: vi.fn(),
};

/**
 * A complete plugin context for the given working directory.
 *
 * Built in full rather than as a `Partial` that each call site casts back: the
 * fields semantic-release always provides are cheap to supply, and supplying them
 * means the fixture is checked against the type instead of asserted past it.
 * @param cwd The directory the plugin should treat as the package root.
 * @returns A context accepted by both `publish` and `success`.
 */
const createContext = (cwd: string): PublishContext => {
    return {
        branch: { name: "foo" },
        branches: [{ name: "foo" }],
        commits: [],
        cwd,
        env: {},
        lastRelease: {
            gitHead: "foo",
            gitTag: "v1.0.0",
            version: "1.0.0",
        },
        logger,
        nextRelease: {
            gitHead: "foo",
            gitTag: "2.0.0",
            type: "major",
            version: "2.0.0",
        },
        options: {},
        releases: [],
        stderr,
        stdout,
    };
};

describe("semantic-release-clean-package-json", () => {
    let temporaryDirectoryPath: string;

    beforeEach(() => {
        temporaryDirectoryPath = mkdtempSync(join(tmpdir(), "clean-pkg-json-"));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true });

        vi.resetAllMocks();
    });

    it("should removes unnecessary properties", async () => {
        expect.assertions(4);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

        await publish({}, createContext(temporaryDirectoryPath));

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
        expect(logger.log).toHaveBeenCalledWith("Created a backup of the package.json file.");
        expect(logger.log).toHaveBeenCalledWith('Removing property "devDependencies"');
        expect(logger.log).toHaveBeenCalledWith('Removing property "eslintConfig"');
    });

    it("should keep flag from given config", async () => {
        expect.assertions(3);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

        await publish(
            {
                keep: ["eslintConfig", "devDependencies"],
            },
            createContext(temporaryDirectoryPath),
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
        expect(logger.log).toHaveBeenCalledWith("Created a backup of the package.json file.");
        expect(logger.log).toHaveBeenCalledWith(
            "Keeping the following properties: name, version, private, publishConfig, scripts.preinstall, scripts.install, scripts.postinstall, scripts.dependencies, files, bin, browser, main, man, jsdelivr, unpkg, dependencies, peerDependencies, peerDependenciesMeta, bundledDependencies, optionalDependencies, engines, os, cpu, description, keywords, author, contributors, license, homepage, repository, bugs, funding, type, exports, imports, sponsor, publisher, displayName, categories, galleryBanner, preview, contributes, activationEvents, badges, markdown, qna, extensionPack, extensionDependencies, extensionKind, icon, fesm2020, fesm2015, esm2020, es2020, types, typings, typesVersions, module, sideEffects, eslintConfig, devDependencies",
        );
    });

    it("should keep the line endings and indentation of the package.json", async () => {
        expect.assertions(2);

        const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

        await writeFile(packageJsonPath, `{\r\n\t"name": "test-package",\r\n\t"version": "1.0.0"\r\n}\r\n`);

        await publish({}, createContext(temporaryDirectoryPath));

        await expect(readFile(packageJsonPath)).resolves.toBe(`{\r\n\t"name": "test-package",\r\n\t"version": "1.0.0"\r\n}\r\n`);
        await expect(readFile(`${temporaryDirectoryPath}/package.json.back`)).resolves.toBe(
            `{\r\n\t"name": "test-package",\r\n\t"version": "1.0.0"\r\n}\r\n`,
        );
    });

    describe(success, () => {
        it("should restore package.json from backup and update version", async () => {
            expect.assertions(3);

            const packageJsonPath = `${temporaryDirectoryPath}/package.json`;

            // Create and write initial package.json
            await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

            // Run publish to create backup and modify package.json
            await publish({}, createContext(temporaryDirectoryPath));

            // Run success to restore from backup
            await success({}, createContext(temporaryDirectoryPath));

            // Verify the restored package.json
            const restoredPackageJson = await readJson(packageJsonPath);

            expect(restoredPackageJson).toStrictEqual(DEFAULT_PACKAGE_JSON); // This is just mocked without the pnpm or npm semantic-release plugin

            expect(logger.log).toHaveBeenCalledWith("Restored modified package.json from backup.");
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("should log error when backup file is not found", async () => {
            expect.assertions(2);

            // Run success without creating backup first
            await success({}, createContext(temporaryDirectoryPath));

            expect(logger.error).toHaveBeenCalledWith("No backup package.json found.");
            expect(logger.log).not.toHaveBeenCalledWith("Restored modified package.json from backup.");
        });

        it("should handle custom pkgRoot", async () => {
            expect.assertions(3);

            const customRoot = `${temporaryDirectoryPath}/dist`;
            const packageJsonPath = `${customRoot}/package.json`;

            // Create custom directory and package.json
            await rm(customRoot, { force: true, recursive: true });
            await writeJson(packageJsonPath, DEFAULT_PACKAGE_JSON);

            // Run publish with custom pkgRoot
            await publish({ pkgRoot: "dist" }, createContext(temporaryDirectoryPath));

            // Run success with custom pkgRoot
            await success({ pkgRoot: "dist" }, createContext(temporaryDirectoryPath));

            // Verify the restored package.json
            const restoredPackageJson = await readJson(packageJsonPath);

            expect(restoredPackageJson).toStrictEqual(DEFAULT_PACKAGE_JSON); // This is just mocked without the pnpm or npm semantic-release plugin

            expect(logger.log).toHaveBeenCalledWith("Restored modified package.json from backup.");
            expect(logger.error).not.toHaveBeenCalled();
        });
    });
});

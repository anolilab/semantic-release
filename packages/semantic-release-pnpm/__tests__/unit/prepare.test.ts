import { rm } from "node:fs/promises";

import { isAccessible, readFile, readJson, writeFile, writeJson } from "@visulima/fs";
import type { PackageJson } from "@visulima/package";
import { join } from "@visulima/path";
// eslint-disable-next-line e18e/ban-dependencies
import { WritableStreamBuffer } from "stream-buffers";
// eslint-disable-next-line e18e/ban-dependencies
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrepareContext } from "../../src/definitions/context";
import type { PluginConfig } from "../../src/definitions/plugin-config";
import prepare from "../../src/prepare";

vi.mock(import("@visulima/package"), async (importOriginal) => {
    const actual = await importOriginal();

    return { ...actual, getPackageManagerVersion: vi.fn(() => "10.33.0") };
});

// eslint-disable-next-line e18e/ban-dependencies
vi.mock(import("execa"), async (importOriginal) => {
    const actual = await importOriginal();

    return { ...actual, execa: vi.fn(actual.execa) };
});

const { getPackageManagerVersion } = await import("@visulima/package");
const getPackageManagerVersionMock = vi.mocked(getPackageManagerVersion);

// eslint-disable-next-line e18e/ban-dependencies
const { execa: execaImport } = await import("execa");
const execaMock = vi.mocked(execaImport);

const logSpy = vi.fn();

const logger = { error: vi.fn(), log: logSpy, success: vi.fn() };

describe(prepare, () => {
    let cwd: string;

    const runPrepare = async (version: string, pluginConfig: PluginConfig = {}): Promise<void> => {
        await prepare(pluginConfig, {
            cwd,
            env: {},
            logger,
            nextRelease: { version },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);
    };

    beforeEach(() => {
        cwd = temporaryDirectory();
        getPackageManagerVersionMock.mockReturnValue("10.33.0");
        execaMock.mockClear();
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });
    });

    it("should update package.json", async () => {
        expect.assertions(2);

        const packagePath = join(cwd, "package.json");

        await writeJson(packagePath, { name: "test", version: "0.0.0-dev" });

        await runPrepare("1.0.0");

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("1.0.0");
        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
    });

    it("should update package.json and npm-shrinkwrap.json", async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const shrinkwrapPath = join(cwd, "npm-shrinkwrap.json");

        await writeJson(packagePath, { version: "0.0.0-dev" });
        // Create a npm-shrinkwrap.json file manually (npm v11+ removed `npm shrinkwrap`)
        await writeJson(shrinkwrapPath, { version: "0.0.0-dev" });

        await runPrepare("1.0.0");

        const packageJson = await readJson<PackageJson>(packagePath);
        const shrinkwrap = await readJson<Record<string, string>>(shrinkwrapPath);

        expect(packageJson.version).toBe("1.0.0");
        expect(shrinkwrap.version).toBe("1.0.0");
        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
    });

    it("should preserve indentation and newline", async () => {
        expect.assertions(2);

        const packagePath = join(cwd, "package.json");

        await writeFile(packagePath, `{\r\n        "name": "package-name",\r\n        "version": "0.0.0-dev"\r\n}\r\n`);

        await runPrepare("1.0.0");

        const expectedContent = `{\r\n        "name": "package-name",\r\n        "version": "1.0.0"\r\n}\r\n`;

        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
        await expect(readFile(packagePath)).resolves.toStrictEqual(expectedContent);
    });

    it("should update a package.json written with a BOM", async () => {
        expect.assertions(1);

        const packagePath = join(cwd, "package.json");

        await writeFile(packagePath, `\u{FEFF}{\n  "name": "bom-pkg",\n  "version": "0.0.0-dev"\n}\n`);

        await runPrepare("1.0.0");

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("1.0.0");
    });

    it("should name the file when package.json is malformed", async () => {
        expect.assertions(1);

        const packagePath = join(cwd, "package.json");

        await writeFile(packagePath, `{ "name": broken }`);

        await expect(runPrepare("1.0.0")).rejects.toThrow(packagePath);
    });

    it('should update the package.json in "pkgRoot"', async () => {
        expect.assertions(1);

        const packagePath = join(cwd, "dist/package.json");

        await writeJson(packagePath, { name: "test", version: "0.0.0-dev" });

        await runPrepare("1.0.0", { pkgRoot: "dist" });

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("1.0.0");
    });

    it('should create the package in the "tarballDir" directory', async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const packageInfo = { name: "my-pkg", version: "0.0.0-dev" };

        await writeJson(packagePath, packageInfo);

        await runPrepare("1.0.0", { tarballDir: "tarball" });

        const tarballPath = join(cwd, `tarball/${packageInfo.name}-1.0.0.tgz`);
        const packageJson = await readJson<PackageJson>(packagePath);

        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
        expect(packageJson.version).toBe("1.0.0");
        await expect(isAccessible(tarballPath)).resolves.toBe(true);
    });

    it('should only move the created tarball if the "tarballDir" directory is not the CWD', async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const packageInfo = { name: "my-pkg", version: "0.0.0-dev" };

        await writeJson(packagePath, packageInfo);

        await runPrepare("1.0.0", { tarballDir: "." });

        const tarballPath = join(cwd, `${packageInfo.name}-1.0.0.tgz`);
        const packageJson = await readJson<PackageJson>(packagePath);

        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
        expect(packageJson.version).toBe("1.0.0");
        await expect(isAccessible(tarballPath)).resolves.toBe(true);
    });

    // https://github.com/anolilab/semantic-release/issues/375: shelling out to `npm pkg set` aborts
    // the release with EBADDEVENGINES in packages that enforce `devEngines.packageManager: pnpm`.
    it("should not shell out to any package manager on pnpm v10+", async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const devEngines = { packageManager: { name: "pnpm", onFail: "error" } };

        await writeJson(packagePath, { devEngines, name: "pkg", version: "0.0.0-dev" });

        await runPrepare("5.0.0");

        const packageJson = await readJson<PackageJson & { devEngines: unknown }>(packagePath);

        expect(packageJson.version).toBe("5.0.0");
        expect(packageJson.devEngines).toStrictEqual(devEngines);
        expect(execaMock).not.toHaveBeenCalled();
    });

    it("should not fail on pnpm v10 when npm-shrinkwrap.json is absent", async () => {
        expect.assertions(2);

        const packagePath = join(cwd, "package.json");

        await writeJson(packagePath, { name: "pkg", version: "0.0.0-dev" });

        await runPrepare("4.0.0");

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("4.0.0");
        await expect(isAccessible(join(cwd, "npm-shrinkwrap.json"))).resolves.toBe(false);
    });

    it("should set the version via `pnpm version` on pnpm v9", async () => {
        expect.assertions(3);

        getPackageManagerVersionMock.mockReturnValue("9.15.0");

        const packagePath = join(cwd, "package.json");

        await writeJson(packagePath, { name: "legacy-pkg", version: "0.0.0-dev" });

        await runPrepare("2.1.0");

        const versionCalls = execaMock.mock.calls.filter(([bin, arguments_]) => bin === "pnpm" && Array.isArray(arguments_) && arguments_[0] === "version");
        const packageJson = await readJson<PackageJson>(packagePath);

        expect(versionCalls).toHaveLength(1);
        expect(versionCalls[0]?.[1]).toStrictEqual(["version", "2.1.0", "--no-git-tag-version", "--allow-same-version"]);
        expect(packageJson.version).toBe("2.1.0");
    });
});

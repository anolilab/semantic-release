import { rm } from "node:fs/promises";

import { isAccessible, readFile, readJson, writeFile, writeJson } from "@visulima/fs";
import type { PackageJson } from "@visulima/package";
import { join } from "@visulima/path";
// eslint-disable-next-line e18e/ban-dependencies
import { execa } from "execa";
import { WritableStreamBuffer } from "stream-buffers";
// eslint-disable-next-line e18e/ban-dependencies
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrepareContext } from "../../src/definitions/context";
import prepare from "../../src/prepare";

vi.mock(import("@visulima/package"), async (importOriginal) => {
    const actual = await importOriginal();

    return { ...actual, getPackageManagerVersion: vi.fn(() => "10.33.0") };
});

const { getPackageManagerVersion } = await import("@visulima/package");
const getPackageManagerVersionMock = vi.mocked(getPackageManagerVersion);

const logSpy = vi.fn();

const logger = { error: vi.fn(), log: logSpy, success: vi.fn() };

describe(prepare, () => {
    let cwd: string;

    beforeEach(() => {
        cwd = temporaryDirectory();
        getPackageManagerVersionMock.mockReturnValue("10.33.0");
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });
    });

    it("should update package.json", async () => {
        expect.assertions(2);

        const packagePath = join(cwd, "package.json");

        await writeJson(packagePath, { name: "test", version: "0.0.0-dev" });

        await prepare({}, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "1.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("1.0.0");
        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
    });

    it("should update package.json and npm-shrinkwrap.json", async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const shrinkwrapPath = join(cwd, "npm-shrinkwrap.json");

        await writeJson(packagePath, { version: "0.0.0-dev" });
        // Create a npm-shrinkwrap.json file
        await execa("npm", ["shrinkwrap"], { cwd });

        await prepare({}, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "1.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

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

        await prepare({}, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "1.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const expectedContent = `{\r\n        "name": "package-name",\r\n        "version": "1.0.0"\r\n}\r\n`;

        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
        await expect(readFile(packagePath)).resolves.toStrictEqual(expectedContent);
    });

    it("should create the package in the \"tarballDir\" directory", async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const packageInfo = { name: "my-pkg", version: "0.0.0-dev" };

        await writeJson(packagePath, packageInfo);

        await prepare({ tarballDir: "tarball" }, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "1.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const tarballPath = join(cwd, `tarball/${packageInfo.name}-1.0.0.tgz`);
        const packageJson = await readJson<PackageJson>(packagePath);

        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
        expect(packageJson.version).toBe("1.0.0");
        await expect(isAccessible(tarballPath)).resolves.toBe(true);
    });

    it("should only move the created tarball if the \"tarballDir\" directory is not the CWD", async () => {
        expect.assertions(3);

        const packagePath = join(cwd, "package.json");
        const packageInfo = { name: "my-pkg", version: "0.0.0-dev" };

        await writeJson(packagePath, packageInfo);

        await prepare({ tarballDir: "." }, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "1.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const tarballPath = join(cwd, `${packageInfo.name}-1.0.0.tgz`);
        const packageJson = await readJson<PackageJson>(packagePath);

        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "1.0.0", cwd);
        expect(packageJson.version).toBe("1.0.0");
        await expect(isAccessible(tarballPath)).resolves.toBe(true);
    });

    it("should update package.json on pnpm v9 via `pnpm version`", async () => {
        expect.assertions(2);

        getPackageManagerVersionMock.mockReturnValue("9.15.0");

        const packagePath = join(cwd, "package.json");

        await writeJson(packagePath, { name: "legacy-pkg", version: "0.0.0-dev" });

        await prepare({}, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "2.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("2.0.0");
        expect(logSpy).toHaveBeenCalledWith("Write version %s to package.json in %s", "2.0.0", cwd);
    });

    it("should sync npm-shrinkwrap.json manually on pnpm v10", async () => {
        expect.assertions(2);

        getPackageManagerVersionMock.mockReturnValue("10.33.0");

        const packagePath = join(cwd, "package.json");
        const shrinkwrapPath = join(cwd, "npm-shrinkwrap.json");

        await writeJson(packagePath, { name: "pkg", version: "0.0.0-dev" });
        await writeJson(shrinkwrapPath, { name: "pkg", version: "0.0.0-dev" });

        await prepare({}, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "3.1.4" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const packageJson = await readJson<PackageJson>(packagePath);
        const shrinkwrap = await readJson<Record<string, string>>(shrinkwrapPath);

        expect(packageJson.version).toBe("3.1.4");
        expect(shrinkwrap.version).toBe("3.1.4");
    });

    it("should not fail on pnpm v10 when npm-shrinkwrap.json is absent", async () => {
        expect.assertions(2);

        getPackageManagerVersionMock.mockReturnValue("10.33.0");

        const packagePath = join(cwd, "package.json");

        await writeJson(packagePath, { name: "pkg", version: "0.0.0-dev" });

        await prepare({}, {
            cwd,
            env: {},
            logger,
            nextRelease: { version: "4.0.0" },
            stderr: new WritableStreamBuffer(),
            stdout: new WritableStreamBuffer(),
        } as unknown as PrepareContext);

        const packageJson = await readJson<PackageJson>(packagePath);

        expect(packageJson.version).toBe("4.0.0");
        await expect(isAccessible(join(cwd, "npm-shrinkwrap.json"))).resolves.toBe(false);
    });
});

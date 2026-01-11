import { rm } from "node:fs/promises";

import { isAccessible, readFile, readJson, writeFile, writeJson } from "@visulima/fs";
import type { PackageJson } from "@visulima/package";
import { join } from "@visulima/path";
import { execa } from "execa";
import { WritableStreamBuffer } from "stream-buffers";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrepareContext } from "../../src/definitions/context";
import prepare from "../../src/prepare";

const logSpy = vi.fn();

const logger = { error: vi.fn(), log: logSpy, success: vi.fn() };

describe(prepare, () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = temporaryDirectory();
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

    it('should create the package in the "tarballDir" directory', async () => {
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

    it('should only move the created tarball if the "tarballDir" directory is not the CWD', async () => {
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
});

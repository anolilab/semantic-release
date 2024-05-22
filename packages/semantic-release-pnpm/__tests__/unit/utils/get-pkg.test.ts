// eslint-disable-next-line unicorn/prevent-abbreviations
import { rm } from "node:fs/promises";

import { writeFile, writeJson } from "@visulima/fs";
import { resolve } from "@visulima/path";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import getPackage from "../../../src/utils/get-pkg";

describe("get-pkg", () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = temporaryDirectory();
    });

    afterEach(async () => {
        await rm(cwd, { recursive: true });
    });

    it("verify name and version then return parsed package.json", async () => {
        expect.assertions(2);

        const packageJson = { name: "package", version: "0.0.0" };
        await writeJson(resolve(cwd, "package.json"), packageJson);

        const result = await getPackage({}, { cwd });

        expect(result.name).toBe(packageJson.name);
        expect(result.version).toBe(packageJson.version);
    });

    it("verify name and version then return parsed package.json from a sub-directory", async () => {
        expect.assertions(2);

        const packageRoot = "dist";
        const packageJson = { name: "package", version: "0.0.0" };
        await writeJson(resolve(cwd, packageRoot, "package.json"), packageJson);

        const result = await getPackage({ pkgRoot: packageRoot }, { cwd });

        expect(result.name).toBe(packageJson.name);
        expect(result.version).toBe(packageJson.version);
    });

    it("throw error if missing package.json", async () => {
        expect.assertions(3);

        try {
            await getPackage({}, { cwd });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typeError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.name).toBe("AggregateError");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.message).toContain("Missing `package.json` file.");
            // eslint-disable-next-line vitest/no-conditional-expect,@typescript-eslint/no-unsafe-member-access
            expect(typeError.errors[0].code).toBe("ENOPKG");
        }
    });

    it("throw error if missing package name", async () => {
        expect.assertions(3);

        await writeJson(resolve(cwd, "package.json"), { version: "0.0.0" });

        try {
            await getPackage({}, { cwd });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const typeError = error as AggregateError;

            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.name).toBe("AggregateError");
            // eslint-disable-next-line vitest/no-conditional-expect
            expect(typeError.message).toContain("Missing `name` property in `package.json`");
            // eslint-disable-next-line vitest/no-conditional-expect,@typescript-eslint/no-unsafe-member-access
            expect(typeError.errors[0].code).toBe("ENOPKGNAME");
        }
    });

    it("throw error if package.json is malformed", async () => {
        expect.assertions(1);

        await writeFile(resolve(cwd, "package.json"), "{name: 'package',}");

        await expect(getPackage({}, { cwd })).rejects.toThrow("JSON at position 1");
    });
});

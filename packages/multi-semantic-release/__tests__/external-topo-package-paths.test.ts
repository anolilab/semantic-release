import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { topo } from "@semrel-extra/topo";
import { describe, expect, it } from "vitest";

import transformPath from "./helpers/transform-path";

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../__fixtures__");

const getPackagePaths = async (cwd: string, ignore: string[] = []): Promise<string[]> => {
    const workspacesExtra = ignore.map((item) => `!${item}`);
    const result = await topo({ cwd, workspacesExtra });

    return (
        Object.values(result.packages)
            .map((package_) => package_.manifestPath)
            // This is only needed for the testing
            .map((value) => transformPath(value))
            .toSorted()
    );
};

describe("getPackagePaths()", () => {
    it("yarn: Works correctly with workspaces", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/yarnWorkspaces`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [
                `${resolved}/packages/a/package.json`,
                `${resolved}/packages/b/package.json`,
                `${resolved}/packages/c/package.json`,
                `${resolved}/packages/d/package.json`,
            ].map((path) => transformPath(path)),
        );
    });

    it("yarn: Should ignore some packages", async () => {
        expect.assertions(2);

        const resolved = resolve(`${fixturesPath}/yarnWorkspacesIgnore`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [`${resolved}/packages/a/package.json`, `${resolved}/packages/b/package.json`, `${resolved}/packages/c/package.json`].map((path) =>
                transformPath(path),
            ),
        );

        const resolvedSplit = resolve(`${fixturesPath}/yarnWorkspacesIgnoreSplit`);

        await expect(getPackagePaths(resolvedSplit)).resolves.toStrictEqual(
            [`${resolvedSplit}/packages/a/package.json`, `${resolvedSplit}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });

    it("yarn: Should ignore some packages via CLI", async () => {
        expect.assertions(2);

        const resolved = resolve(`${fixturesPath}/yarnWorkspacesIgnore`);

        await expect(getPackagePaths(resolved, ["packages/a/**", "packages/b/**"])).resolves.toStrictEqual(
            [`${resolved}/packages/c/package.json`].map((path) => transformPath(path)),
        );

        const resolvedSplit = resolve(`${fixturesPath}/yarnWorkspacesIgnoreSplit`);

        await expect(getPackagePaths(resolvedSplit, ["packages/b", "packages/d"])).resolves.toStrictEqual(
            [`${resolvedSplit}/packages/a/package.json`, `${resolvedSplit}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });

    it("yarn: Works correctly with workspaces.packages", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/yarnWorkspacesPackages`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [
                `${resolved}/packages/a/package.json`,
                `${resolved}/packages/b/package.json`,
                `${resolved}/packages/c/package.json`,
                `${resolved}/packages/d/package.json`,
            ].map((path) => transformPath(path)),
        );
    });

    it("pnpm: Works correctly with workspace", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/pnpmWorkspace`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [
                `${resolved}/packages/a/package.json`,
                `${resolved}/packages/b/package.json`,
                `${resolved}/packages/c/package.json`,
                `${resolved}/packages/d/package.json`,
            ].map((path) => transformPath(path)),
        );
    });

    it("pnpm: Should ignore some packages", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/pnpmWorkspaceIgnore`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [`${resolved}/packages/a/package.json`, `${resolved}/packages/b/package.json`, `${resolved}/packages/c/package.json`].map((path) =>
                transformPath(path),
            ),
        );
    });

    it("pnpm: Should ignore some packages via CLI", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/pnpmWorkspaceIgnore`);

        await expect(getPackagePaths(resolved, ["packages/a/**", "packages/b/**"])).resolves.toStrictEqual(
            [`${resolved}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });

    it("bolt: Works correctly with workspaces", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/boltWorkspaces`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [
                `${resolved}/packages/a/package.json`,
                `${resolved}/packages/b/package.json`,
                `${resolved}/packages/c/package.json`,
                `${resolved}/packages/d/package.json`,
            ].map((path) => transformPath(path)),
        );
    });

    it("bolt: Should ignore some packages", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/boltWorkspacesIgnore`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [`${resolved}/packages/a/package.json`, `${resolved}/packages/b/package.json`, `${resolved}/packages/c/package.json`].map((path) =>
                transformPath(path),
            ),
        );
    });

    it("bolt: Should ignore some packages via CLI", async () => {
        expect.assertions(1);

        const resolved = resolve(`${fixturesPath}/boltWorkspacesIgnore`);

        await expect(getPackagePaths(resolved, ["packages/a/**", "packages/b/**"])).resolves.toStrictEqual(
            [`${resolved}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });
});

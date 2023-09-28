import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { topo } from "@semrel-extra/topo";
import { describe, expect, it } from "vitest";

import transformPath from "../helpers/transform-path.js";

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../__fixtures__");

const getPackagePaths = async (cwd, ignore = []) => {
    const workspacesExtra = ignore.map((item) => `!${item}`);
    const result = await topo({ cwd, workspacesExtra });

    return Object.values(result.packages)
        .map((package_) => package_.manifestPath)
        .sort();
};

describe("getPackagePaths()", () => {
    it("yarn: Works correctly with workspaces", async () => {
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
        const resolved = resolve(`${fixturesPath}/yarnWorkspacesIgnore`);

        await expect(getPackagePaths(resolved, ["packages/a/**", "packages/b/**"])).resolves.toStrictEqual([`${resolved}/packages/c/package.json`]);

        const resolvedSplit = resolve(`${fixturesPath}/yarnWorkspacesIgnoreSplit`);

        await expect(getPackagePaths(resolvedSplit, ["packages/b", "packages/d"])).resolves.toStrictEqual(
            [`${resolvedSplit}/packages/a/package.json`, `${resolvedSplit}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });
    // __tests__("yarn: Should throw when ignored packages from CLI and workspaces sets an empty workspace list to be processed", async () => {
    // 	const resolved = resolve(`${__dirname}/../__fixtures__/yarnWorkspacesIgnore`);
    // 	expect(() => await getPackagePaths(resolved, ["packages/a/**", "packages/b/**", "packages/c/**"])).toThrow(TypeError);
    // 	expect(() => await getPackagePaths(resolved, ["packages/a/**", "packages/b/**", "packages/c/**"])).toThrow(
    // 		"package.json: Project must contain one or more workspace-packages"
    // 	);
    // });
    // __tests__("yarn: Error if no workspaces setting", async () => {
    // 	const resolved = resolve(`${__dirname}/../__fixtures__/emptyYarnWorkspaces`);
    // 	expect(() => await getPackagePaths(resolved)).toThrow(Error);
    // 	expect(() => await getPackagePaths(resolved)).toThrow("contain one or more workspace-packages");
    // });

    it("yarn: Works correctly with workspaces.packages", async () => {
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
    // __tests__("pnpm: Error if no workspaces setting", async () => {
    // 	const resolved = resolve(`${__dirname}/../__fixtures__/pnpmWorkspaceUndefined`);
    // 	expect(() => await getPackagePaths(resolved)).toThrow(Error);
    // 	expect(() => await getPackagePaths(resolved)).toThrow("contain one or more workspace-packages");
    // });

    it("pnpm: Should ignore some packages", async () => {
        const resolved = resolve(`${fixturesPath}/pnpmWorkspaceIgnore`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [`${resolved}/packages/a/package.json`, `${resolved}/packages/b/package.json`, `${resolved}/packages/c/package.json`].map((path) =>
                transformPath(path),
            ),
        );
    });

    it("pnpm: Should ignore some packages via CLI", async () => {
        const resolved = resolve(`${fixturesPath}/pnpmWorkspaceIgnore`);

        await expect(getPackagePaths(resolved, ["packages/a/**", "packages/b/**"])).resolves.toStrictEqual(
            [`${resolved}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });

    it("bolt: Works correctly with workspaces", async () => {
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
    // __tests__("bolt: Error if no workspaces setting", async () => {
    // 	const resolved = resolve(`${__dirname}/../__fixtures__/boltWorkspacesUndefined`);
    // 	expect(() => await getPackagePaths(resolved)).toThrow(Error);
    // 	expect(() => await getPackagePaths(resolved)).toThrow("contain one or more workspace-packages");
    // });

    it("bolt: Should ignore some packages", async () => {
        const resolved = resolve(`${fixturesPath}/boltWorkspacesIgnore`);

        await expect(getPackagePaths(resolved)).resolves.toStrictEqual(
            [`${resolved}/packages/a/package.json`, `${resolved}/packages/b/package.json`, `${resolved}/packages/c/package.json`].map((path) =>
                transformPath(path),
            ),
        );
    });

    it("bolt: Should ignore some packages via CLI", async () => {
        const resolved = resolve(`${fixturesPath}/boltWorkspacesIgnore`);

        await expect(getPackagePaths(resolved, ["packages/a/**", "packages/b/**"])).resolves.toStrictEqual(
            [`${resolved}/packages/c/package.json`].map((path) => transformPath(path)),
        );
    });
});

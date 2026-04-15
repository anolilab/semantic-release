/* eslint-disable jsdoc/informative-docs */
import { isAccessible, move, readJson, writeJson } from "@visulima/fs";
import { getPackageManagerVersion } from "@visulima/package";
import { resolve } from "@visulima/path";
import dbg from "debug";
// eslint-disable-next-line e18e/ban-dependencies
import { execa } from "execa";
import { major } from "semver";

import type { PrepareContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";

const debug = dbg("semantic-release-pnpm:prepare");

/**
 * Prepare the package for publishing by
 * 1. writing the upcoming semantic-release version to the `package.json` — via `pnpm version`
 * (without creating a git tag) on pnpm &lt; 10, or via `pnpm pkg set` on pnpm v10+ where the
 * `version` command does not reliably accept `--no-git-tag-version` — and
 * 2. optionally creating a tarball via `pnpm pack` which is moved to the configured `tarballDir`.
 *
 * The function mirrors the behaviour of the official semantic-release `@semantic-release/npm` plugin
 * while using the `pnpm` CLI instead of `npm`.
 * @param pluginConfig Plugin configuration. Only `pkgRoot` and `tarballDir` are
 * relevant for this function.
 * @param pluginConfig.pkgRoot The root directory of the package.
 * @param pluginConfig.tarballDir The directory to move the tarball to.
 * @param context Semantic-release prepare context containing IO streams,
 * @param context.cwd The current working directory.
 * @param context.env The environment variables.
 * @param context.logger The logger.
 * @param context.nextRelease The next release.
 * @param context.nextRelease.version The version of the next release.
 * @param context.stderr The standard error stream.
 * @param context.stdout The standard output stream.
 * logger, environment variables and release information.
 * @returns A promise that resolves once the version has been written and the optional
 * tarball has been created (and moved).
 */
const prepare = async (
    { pkgRoot, tarballDir }: PluginConfig,
    { cwd, env, logger, nextRelease: { version }, stderr, stdout }: PrepareContext,
): Promise<void> => {
    const basePath = pkgRoot ? resolve(cwd, pkgRoot) : cwd;

    logger.log("Write version %s to package.json in %s", version, basePath);

    const pnpmVersion = getPackageManagerVersion("pnpm");
    const pnpmMajor = major(pnpmVersion);

    debug("Detected pnpm major version: %d", pnpmMajor);

    // pnpm v10 tightened CLI option parsing and some releases reject
    // `--no-git-tag-version` on `pnpm version`. Use the stable `pnpm pkg set`
    // command on v10+, and keep `pnpm version` for older versions so its
    // side-effects (e.g. npm-shrinkwrap.json sync, version lifecycle scripts)
    // continue to work as before.
    const versionArguments = pnpmMajor >= 10 ? ["pkg", "set", `version=${version}`] : ["version", version, "--no-git-tag-version", "--allow-same-version"];

    const versionResult = execa("pnpm", versionArguments, {
        cwd: basePath,
        env,
        preferLocal: true,
    });

    versionResult.stdout.pipe(stdout, { end: false });
    versionResult.stderr.pipe(stderr, { end: false });

    await versionResult;

    // `pnpm pkg set` does not update npm-shrinkwrap.json like `pnpm version`
    // does, so mirror the version bump manually on pnpm v10+.
    if (pnpmMajor >= 10) {
        const shrinkwrapPath = resolve(basePath, "npm-shrinkwrap.json");

        if (await isAccessible(shrinkwrapPath)) {
            debug(`Updating npm-shrinkwrap.json at ${shrinkwrapPath}`);

            const shrinkwrap = (await readJson(shrinkwrapPath)) as Record<string, unknown>;

            shrinkwrap.version = version;

            await writeJson(shrinkwrapPath, shrinkwrap, { indent: 2 });
        }
    }

    if (tarballDir) {
        logger.log("Creating npm package version %s", version);

        const packResult = execa("pnpm", ["pack", basePath], { cwd, env, preferLocal: true });

        packResult.stdout.pipe(stdout, { end: false });
        packResult.stderr.pipe(stderr, { end: false });

        // eslint-disable-next-line unicorn/no-await-expression-member
        const tarball = (await packResult).stdout.split("\n").pop() as string;
        const tarballSource = resolve(cwd, tarball);
        const tarballDestination = resolve(cwd, tarballDir.trim(), tarball);

        debug(`Created tarball: ${tarball}`);

        // Only move the tarball if we need to
        // Fixes: https://github.com/semantic-release/npm/issues/169
        if (tarballSource === tarballDestination) {
            debug(`Tarball already at destination: ${tarballDestination}`);
        } else {
            debug(`Moving tarball from ${tarballSource} to ${tarballDestination}`);
            await move(tarballSource, tarballDestination);
        }
    }
};

export default prepare;

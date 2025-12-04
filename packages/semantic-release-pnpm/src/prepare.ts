/* eslint-disable jsdoc/informative-docs */
import { move } from "@visulima/fs";
import { resolve } from "@visulima/path";
import dbg from "debug";
import { execa } from "execa";

import type { PrepareContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";

const debug = dbg("semantic-release-pnpm:prepare");

/**
 * Prepare the package for publishing by
 * 1. writing the upcoming semantic-release version to the `package.json` with `pnpm version` (without
 * creating a git tag) and
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

    const versionResult = execa("pnpm", ["version", version, "--no-git-tag-version", "--allow-same-version"], {
        cwd: basePath,
        env,
        preferLocal: true,
    });

    versionResult.stdout.pipe(stdout, { end: false });
    versionResult.stderr.pipe(stderr, { end: false });

    await versionResult;

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

import { move } from "@visulima/fs";
import { resolve } from "@visulima/path";
import { execa } from "execa";

import type { PrepareContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";

/**
 * Prepare the package for publishing by
 * 1. writing the upcoming semantic-release version to the `package.json` with `pnpm version` (without
 *    creating a git tag) and
 * 2. optionally creating a tarball via `pnpm pack` which is moved to the configured `tarballDir`.
 *
 * The function mirrors the behaviour of the official semantic-release `@semantic-release/npm` plugin
 * while using the `pnpm` CLI instead of `npm`.
 *
 * @param {PluginConfig}  pluginConfig – Plugin configuration. Only `pkgRoot` and `tarballDir` are
 *                                       relevant for this function.
 * @param {PrepareContext} context      – Semantic-release prepare context containing IO streams,
 *                                       logger, environment variables and release information.
 *
 * @returns {Promise<void>} A promise that resolves once the version has been written and the optional
 *                          tarball has been created (and moved).
 */
export default async ({ pkgRoot, tarballDir }: PluginConfig, { cwd, env, logger, nextRelease: { version }, stderr, stdout }: PrepareContext): Promise<void> => {
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

        // Only move the tarball if we need to
        // Fixes: https://github.com/semantic-release/npm/issues/169
        if (tarballSource !== tarballDestination) {
            await move(tarballSource, tarballDestination);
        }
    }
};

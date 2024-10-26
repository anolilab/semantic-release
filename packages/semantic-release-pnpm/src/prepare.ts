import { move } from "@visulima/fs";
import { resolve } from "@visulima/path";
import { execa } from "execa";

import type { PrepareContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";

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

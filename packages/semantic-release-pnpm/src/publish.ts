/* eslint-disable jsdoc/informative-docs */
import type { PackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";
import dbg from "debug";
import { execa } from "execa";

import type { PublishContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getChannel from "./utils/get-channel";
import getRegistry from "./utils/get-registry";
import type { ReleaseInfo } from "./utils/get-release-info";
import { getReleaseInfo } from "./utils/get-release-info";
import { reasonToNotPublish, shouldPublish } from "./utils/should-publish";

const debug = dbg("semantic-release-pnpm:publish");

/**
 * Publish the package to the npm registry using `pnpm publish` when the plugin configuration and
 * package manifest indicate that publishing should occur.
 *
 * The function calculates the correct distribution tag, resolves the registry URL, ensures the
 * package manager operates in the correct `pkgRoot` (if any) and finally executes the `pnpm` CLI.
 * It mirrors the behaviour of the official `@semantic-release/npm` plugin but utilises the `pnpm`
 * ecosystem.
 * @param pluginConfig Plugin configuration for the semantic-release run.
 * @param pluginConfig.pkgRoot The root directory of the package.
 * @param pluginConfig.publishBranch The branch to publish to.
 * @param packageJson Parsed `package.json` of the project.
 * @param context Semantic-release publish context.
 * @param context.cwd The current working directory.
 * @param context.env The environment variables.
 * @param context.logger The logger.
 * @param context.nextRelease The next release.
 * @param context.nextRelease.channel The channel to publish to.
 * @param context.nextRelease.version The version of the next release.
 * @param context.stderr The standard error stream.
 * @param context.stdout The standard output stream.
 * @returns Information about the published release (name, channel,
 * url) or `false` if the package was not published for any
 * reason (e.g. `npmPublish: false`).
 */
const publish = async (pluginConfig: PluginConfig, packageJson: PackageJson, context: PublishContext): Promise<ReleaseInfo | false> => {
    const {
        cwd,
        env,
        logger,
        nextRelease: { channel, version },
        stderr,
        stdout,
    } = context;
    const { pkgRoot, publishBranch: publishBranchConfig } = pluginConfig;

    if (shouldPublish(pluginConfig, packageJson)) {
        const basePath = pkgRoot ? resolve(cwd, pkgRoot) : cwd;
        const registry = getRegistry(packageJson, context);
        const distributionTag = getChannel(channel);

        const { stdout: currentBranch } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            cwd,
            env,
            preferLocal: true,
        });
        const publishBranches = typeof publishBranchConfig === "string" && publishBranchConfig.split("|");
        const isPublishBranch = publishBranches && publishBranches.includes(currentBranch);
        const publishBranch = isPublishBranch ? currentBranch : "main";

        logger.log(`Publishing version ${version} on branch ${publishBranch} to npm registry on dist-tag ${distributionTag}`);

        const pnpmArguments = ["publish", basePath, "--publish-branch", publishBranch, "--tag", distributionTag, "--registry", registry, "--no-git-checks"];

        if (pluginConfig.disableScripts) {
            pnpmArguments.push("--ignore-scripts");
        }

        debug(`Executing: pnpm ${pnpmArguments.join(" ")}`);

        const result = execa("pnpm", pnpmArguments, {
            cwd,
            env,
            preferLocal: true,
        });

        result.stdout.pipe(stdout, { end: false });
        result.stderr.pipe(stderr, { end: false });

        try {
            await result;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            logger.log(`Failed to publish ${packageJson.name}@${version} to dist-tag @${distributionTag} on ${registry}: ${error.message ?? error}`);

            throw new AggregateError([error], error.message);
        }

        logger.log(`Published ${packageJson.name}@${version} to dist-tag @${distributionTag} on ${registry}`);

        return getReleaseInfo(packageJson, context, distributionTag, registry);
    }

    logger.log(`Skip publishing to npm registry as ${reasonToNotPublish(pluginConfig, packageJson)}`);

    return false;
};

export default publish;

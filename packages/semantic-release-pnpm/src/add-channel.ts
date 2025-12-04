import type { PackageJson } from "@visulima/package";
import dbg from "debug";
import { execa } from "execa";

import type { AddChannelContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getChannel from "./utils/get-channel";
import getNpmrcPath from "./utils/get-npmrc-path";
import getRegistry from "./utils/get-registry";
import type { ReleaseInfo } from "./utils/get-release-info";
import { getReleaseInfo } from "./utils/get-release-info";
import { reasonToNotPublish, shouldPublish } from "./utils/should-publish";

const debug = dbg("semantic-release-pnpm:add-channel");

/**
 * After a successful publish this step adds the newly released version to another npm distribution
 * tag (also known as a "channel") using `pnpm dist-tag add`.
 *
 * Typical use-case: publish a version on `next` first and, after manual verification, promote the
 * same version to the `latest` channel in a follow-up release.
 * @param pluginConfig – Plugin configuration object.
 * @param packageJson – The package manifest that has just been published.
 * @param context – Semantic-release addChannel context.
 * @returns A release info object when the dist-tag was added or
 * `false` when the operation was skipped.
 */
const addChannel = async (pluginConfig: PluginConfig, packageJson: PackageJson, context: AddChannelContext): Promise<ReleaseInfo | false> => {
    const {
        cwd,
        env,
        logger,
        nextRelease: { channel, version },
        stderr,
        stdout,
    } = context;

    if (shouldPublish(pluginConfig, packageJson)) {
        const registry = getRegistry(packageJson, context);
        const distributionTag = getChannel(channel);

        logger.log(`Adding version ${version} to npm registry on dist-tag ${distributionTag}`);

        const npmrc = getNpmrcPath(cwd, env);
        const distTagArguments = ["dist-tag", "add", `${packageJson.name}@${version}`, distributionTag, "--registry", registry];

        debug(`Executing: pnpm ${distTagArguments.join(" ")}`);

        const result = execa("pnpm", distTagArguments, {
            cwd,
            env: {
                ...env,
                NPM_CONFIG_USERCONFIG: npmrc,
            },
            preferLocal: true,
        });

        result.stdout.pipe(stdout, { end: false });
        result.stderr.pipe(stderr, { end: false });

        await result;

        logger.log(`Added ${packageJson.name}@${version} to dist-tag @${distributionTag} on ${registry}`);

        return getReleaseInfo(packageJson, context, distributionTag, registry);
    }

    logger.log(`Skip adding to npm channel as ${reasonToNotPublish(pluginConfig, packageJson)}`);

    return false;
};

export default addChannel;

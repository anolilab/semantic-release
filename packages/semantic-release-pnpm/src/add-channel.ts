import type { PackageJson } from "@visulima/package";
import { execa } from "execa";

import type { AddChannelContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getChannel from "./utils/get-channel";
import getNpmrcPath from "./utils/get-npmrc-path";
import getRegistry from "./utils/get-registry";
import type { ReleaseInfo } from "./utils/get-release-info";
import { getReleaseInfo } from "./utils/get-release-info";
import { reasonToNotPublish, shouldPublish } from "./utils/should-publish";

export default async (pluginConfig: PluginConfig, package_: PackageJson, context: AddChannelContext): Promise<ReleaseInfo | false> => {
    const {
        cwd,
        env,
        logger,
        nextRelease: { channel, version },
        stderr,
        stdout,
    } = context;

    if (shouldPublish(pluginConfig, package_)) {
        const registry = getRegistry(package_, context);
        const distributionTag = getChannel(channel);

        logger.log(`Adding version ${version} to npm registry on dist-tag ${distributionTag}`);

        const npmrc = getNpmrcPath(cwd, env);

        const result = execa("pnpm", ["dist-tag", "add", `${package_.name}@${version}`, distributionTag, "--userconfig", npmrc, "--registry", registry], {
            cwd,
            env,
            preferLocal: true,
        });

        result.stdout.pipe(stdout, { end: false });
        result.stderr.pipe(stderr, { end: false });

        await result;

        logger.log(`Added ${package_.name}@${version} to dist-tag @${distributionTag} on ${registry}`);

        return getReleaseInfo(package_, context, distributionTag, registry);
    }

    logger.log(`Skip adding to npm channel as ${reasonToNotPublish(pluginConfig, package_)}`);

    return false;
};

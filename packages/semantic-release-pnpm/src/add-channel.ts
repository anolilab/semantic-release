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

export default async (pluginConfig: PluginConfig, packageJson: PackageJson, context: AddChannelContext): Promise<ReleaseInfo | false> => {
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

        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        const result = execa("pnpm", ["dist-tag", "add", `${packageJson.name}@${version}`, distributionTag, "--userconfig", npmrc, "--registry", registry], {
            cwd,
            env,
            preferLocal: true,
        });

        result.stdout.pipe(stdout, { end: false });
        result.stderr.pipe(stderr, { end: false });

        await result;

        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        logger.log(`Added ${packageJson.name}@${version} to dist-tag @${distributionTag} on ${registry}`);

        return getReleaseInfo(packageJson, context, distributionTag, registry);
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    logger.log(`Skip adding to npm channel as ${reasonToNotPublish(pluginConfig, packageJson)}`);

    return false;
};

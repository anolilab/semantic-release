import type { PackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";
import AggregateError from "aggregate-error";
import { execa } from "execa";

import type { PublishContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getChannel from "./utils/get-channel";
import getRegistry from "./utils/get-registry";
import type { ReleaseInfo } from "./utils/get-release-info";
import { getReleaseInfo } from "./utils/get-release-info";
import { reasonToNotPublish, shouldPublish } from "./utils/should-publish";

export default async (pluginConfig: PluginConfig, package_: PackageJson, context: PublishContext): Promise<ReleaseInfo | false> => {
    const {
        cwd,
        env,
        logger,
        nextRelease: { channel, version },
        stderr,
        stdout,
    } = context;
    const { pkgRoot, publishBranch: publishBranchConfig } = pluginConfig;

    if (shouldPublish(pluginConfig, package_)) {
        const basePath = pkgRoot ? resolve(cwd, pkgRoot) : cwd;
        const registry = getRegistry(package_, context);
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
            logger.log(`Failed to publish ${package_.name}@${version} to dist-tag @${distributionTag} on ${registry}: ${error.message ?? error}`);

            throw new AggregateError([error]);
        }

        logger.log(`Published ${package_.name}@${version} to dist-tag @${distributionTag} on ${registry}`);

        return getReleaseInfo(package_, context, distributionTag, registry);
    }

    logger.log(`Skip publishing to npm registry as ${reasonToNotPublish(pluginConfig, package_)}`);

    return false;
};

import dbg from "debug";

import addChannelNpm from "./add-channel";
import type { AddChannelContext, PrepareContext, PublishContext, VerifyConditionsContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import prepareNpm from "./prepare";
import publishNpm from "./publish";
import getPackage from "./utils/get-package";
import type { ReleaseInfo } from "./utils/get-release-info";
import verify from "./verify";

const debug = dbg("semantic-release-pnpm:index");
const PLUGIN_NAME = "semantic-release-pnpm";

let verified: boolean;
let prepared: boolean;

/**
 * Verify that the environment and plugin configuration are ready for a semantic-release run. This
 * step is executed during the `verifyConditions` phase.
 *
 * The function delegates the heavy lifting to the local `verify` helper and caches the verification
 * result so that subsequent life-cycle steps can skip running the checks again.
 * @param pluginConfig Plugin configuration object.
 * @param context Semantic-release provided context.
 * @returns Resolves once verification has finished.
 */
export const verifyConditions = async (pluginConfig: PluginConfig, context: VerifyConditionsContext): Promise<void> => {
    /**
     * If the plugin is used and has `npmPublish`, `tarballDir` or
     * `pkgRoot` configured, validate them now in order to prevent any release if
     * the configuration is wrong
     */
    if (context.options.publish) {
        const publish = Array.isArray(context.options.publish) ? context.options.publish : [context.options.publish];

        const publishPlugin = publish.find((config) => config.path && config.path === PLUGIN_NAME) || {};

        // eslint-disable-next-line no-param-reassign
        pluginConfig.npmPublish = pluginConfig.npmPublish ?? publishPlugin.npmPublish;
        // eslint-disable-next-line no-param-reassign
        pluginConfig.tarballDir = pluginConfig.tarballDir ?? publishPlugin.tarballDir;
        // eslint-disable-next-line no-param-reassign
        pluginConfig.pkgRoot = pluginConfig.pkgRoot ?? publishPlugin.pkgRoot;
        // eslint-disable-next-line no-param-reassign
        pluginConfig.disableScripts = pluginConfig.disableScripts ?? publishPlugin.disableScripts;
        // eslint-disable-next-line no-param-reassign
        pluginConfig.branches = pluginConfig.branches ?? publishPlugin.branches;
    }

    await verify(pluginConfig, context);

    verified = true;
};

/**
 * Prepare the package for publication. On success the information is cached so that it is not
 * executed again during `publish` when running the single-package plugin flow.
 * @param pluginConfig Plugin configuration object.
 * @param context Semantic-release provided context.
 * @returns Resolves when preparation steps have completed.
 */
export const prepare = async (pluginConfig: PluginConfig, context: PrepareContext): Promise<void> => {
    if (verified) {
        debug("Skipping verifyConditions (already verified)");
    } else {
        debug("Verification not cached, running verifyConditions");
        await verify(pluginConfig, context);
    }

    await prepareNpm(pluginConfig, context);

    prepared = true;
};

/**
 * Publish the package to the npm registry using `pnpm publish` if the plugin decides that the package
 * should indeed be published.
 * @param pluginConfig Plugin configuration object.
 * @param context Semantic-release provided context containing the upcoming release.
 * @returns Information about the published release or `false` when the
 * package was not published.
 */
export const publish = async (pluginConfig: PluginConfig, context: PublishContext): Promise<ReleaseInfo | false> => {
    const packageJson = await getPackage(pluginConfig, context);

    if (verified) {
        debug("Skipping verifyConditions (already verified)");
    } else {
        debug("Verification not cached, running verifyConditions");
        await verify(pluginConfig, context);
    }

    if (prepared) {
        debug("Skipping prepare (already prepared)");
    } else {
        debug("Preparation not cached, running prepare");
        await prepareNpm(pluginConfig, context);
    }

    return await publishNpm(pluginConfig, packageJson, context);
};

/**
 * Add the freshly published version to an additional npm distribution tag ("channel"). This step is
 * executed in the `addChannel` lifecycle phase.
 * @param pluginConfig Plugin configuration object.
 * @param context Semantic-release provided context containing the upcoming release.
 * @returns Information about the operation or `false` when nothing was
 * done.
 */
export const addChannel = async (pluginConfig: PluginConfig, context: AddChannelContext): Promise<ReleaseInfo | false> => {
    if (verified) {
        debug("Skipping verifyConditions (already verified)");
    } else {
        debug("Verification not cached, running verifyConditions");
        await verify(pluginConfig, context);
    }

    const packageJson = await getPackage(pluginConfig, context);

    return await addChannelNpm(pluginConfig, packageJson, context);
};

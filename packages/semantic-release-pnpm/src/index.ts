import addChannelNpm from "./add-channel";
import type { AddChannelContext, PrepareContext, PublishContext, VerifyConditionsContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import prepareNpm from "./prepare";
import publishNpm from "./publish";
import getPackage from "./utils/get-pkg";
import type { ReleaseInfo } from "./utils/get-release-info";
import verify from "./verify";

const PLUGIN_NAME = "semantic-release-pnpm";

let verified: boolean;
let prepared: boolean;

export const verifyConditions = async (pluginConfig: PluginConfig, context: VerifyConditionsContext): Promise<void> => {
    /**
     * If the plugin is used and has `npmPublish`, `tarballDir` or
     * `pkgRoot` configured, validate them now in order to prevent any release if
     * the configuration is wrong
     */
    if (context.options?.["publish"]) {
        const publish = Array.isArray(context.options?.["publish"]) ? context.options?.["publish"] : [context.options?.["publish"]];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const publishPlugin = publish.find((config) => config.path && config.path === PLUGIN_NAME) || {};

        // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-unsafe-member-access
        pluginConfig.npmPublish = pluginConfig.npmPublish ?? publishPlugin.npmPublish;
        // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-unsafe-member-access
        pluginConfig.tarballDir = pluginConfig.tarballDir ?? publishPlugin.tarballDir;
        // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-unsafe-member-access
        pluginConfig.pkgRoot = pluginConfig.pkgRoot ?? publishPlugin.pkgRoot;
        // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-unsafe-member-access
        pluginConfig.disableScripts = pluginConfig.disableScripts ?? publishPlugin.disableScripts;
        // eslint-disable-next-line no-param-reassign,@typescript-eslint/no-unsafe-member-access
        pluginConfig.branches = pluginConfig.branches ?? publishPlugin.branches;
    }

    await verify(pluginConfig, context);

    verified = true;
};

export const prepare = async (pluginConfig: PluginConfig, context: PrepareContext): Promise<void> => {
    if (!verified) {
        await verify(pluginConfig, context);
    }

    await prepareNpm(pluginConfig, context);

    prepared = true;
};

export const publish = async (pluginConfig: PluginConfig, context: PublishContext): Promise<ReleaseInfo | false> => {
    const packageJson = await getPackage(pluginConfig, context);

    if (!verified) {
        await verify(pluginConfig, context);
    }

    if (!prepared) {
        await prepareNpm(pluginConfig, context);
    }

    return publishNpm(pluginConfig, packageJson, context);
};

export const addChannel = async (pluginConfig: PluginConfig, context: AddChannelContext): Promise<ReleaseInfo | false> => {
    if (!verified) {
        await verify(pluginConfig, context);
    }

    const packageJson = await getPackage(pluginConfig, context);

    return addChannelNpm(pluginConfig, packageJson, context);
};

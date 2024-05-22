import type { PackageJson } from "@visulima/package";

import type { PluginConfig } from "../definitions/plugin-config";

/**
 * Returns null if `npmPublish` is not `false` and `pkg.private` is not
 * `true` or `pkg.workspaces` is not `undefined`.
 * Returns reason otherwise.
 */
export const reasonToNotPublish = (pluginConfig: PluginConfig, package_: PackageJson): string | null =>
    (pluginConfig.npmPublish === false
        ? "npmPublish plugin option is false"
        : package_.private === true && package_.workspaces === undefined
            ? "package is private and has no workspaces"
            : null);

export const shouldPublish = (pluginConfig: PluginConfig, package_: PackageJson): boolean => reasonToNotPublish(pluginConfig, package_) === null;

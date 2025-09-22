import type { PackageJson } from "@visulima/package";

import type { PluginConfig } from "../definitions/plugin-config";

/**
 * Returns null if `npmPublish` is not `false` and `pkg.private` is not
 * `true` or `pkg.workspaces` is not `undefined`.
 * Returns reason otherwise.
 */
export const reasonToNotPublish = (pluginConfig: PluginConfig, package_: PackageJson): string | null => {
    if (pluginConfig.npmPublish === false) {
        return "npmPublish plugin option is false";
    }

    if (package_.private === true && package_.workspaces === undefined) {
        return "package is private and has no workspaces";
    }

    // eslint-disable-next-line unicorn/no-null
    return null;
};

/**
 * Convenience wrapper that returns a boolean instead of a textual reason. It simply negates the
 * result of {@link reasonToNotPublish}.
 * @param pluginConfig – Plugin configuration.
 * @param package_ – Parsed package manifest.
 * @returns `true` when the package should be published, otherwise `false`.
 */
export const shouldPublish = (pluginConfig: PluginConfig, package_: PackageJson): boolean => reasonToNotPublish(pluginConfig, package_) === null;

import { rm } from "node:fs/promises";

import { isAccessible, readJson, writeJson } from "@visulima/fs";
import { join, resolve } from "@visulima/path";
import type { PackageJson } from "type-fest";

import defaultKeepProperties from "./default-keep-properties";
import type { CommonContext, PublishContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getPackage from "./utils/get-package";

/**
 * Clean the `package.json` that will be published by removing properties that are not relevant for the
 * published artifact. All properties defined in `defaultKeepProperties` plus any properties provided
 * via the `pluginConfig.keep` option are preserved. The original `package.json` is backed-up to
 * `package.json.back` before the clean-up starts so that it can be restored later in the `success`
 * step.
 * @param pluginConfig Configuration object passed to the plugin.
 * @param context Semantic-release publish context.
 * @returns Resolves once the cleaned `package.json` has been written to disk.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const publish = async (pluginConfig: PluginConfig, context: PublishContext): Promise<void> => {
    const packageJson = await getPackage(pluginConfig, context);
    const cwd = pluginConfig.pkgRoot ? resolve(context.cwd, pluginConfig.pkgRoot) : context.cwd;

    await writeJson(join(cwd, "package.json.back"), packageJson, {
        detectIndent: true,
    });

    context.logger.log("Created a backup of the package.json file.");

    const keep = pluginConfig.keep ?? [];
    const keepProperties = new Set([...defaultKeepProperties, ...keep]);

    context.logger.log(`Keeping the following properties: ${[...keepProperties].join(", ")}`);

    const packageJsonCopy = { ...packageJson };

    // eslint-disable-next-line no-restricted-syntax
    for (const property in packageJsonCopy) {
        if (keepProperties.has(property)) {
            continue;
        }

        if (property === "scripts") {
            // eslint-disable-next-line no-restricted-syntax
            for (const script in packageJsonCopy.scripts) {
                if (keepProperties.has(`${property}.${script}`)) {
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete packageJsonCopy.scripts[script];
            }

            if (packageJsonCopy.scripts && Object.keys(packageJsonCopy.scripts).length > 0) {
                continue;
            }
        }

        context.logger.log(`Removing property "${property}"`);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete packageJsonCopy[property];
    }

    await writeJson(join(cwd, "package.json"), packageJsonCopy, {
        detectIndent: true,
    });
};

/**
 * Restore the original `package.json` after a successful release. The backed-up version is read from
 * `package.json.back`, its version is replaced with the version that was just released and finally it
 * is written back to `package.json` (overwriting the temporary, cleaned version).
 * @param pluginConfig Configuration object passed to the plugin.
 * @param context Semantic-release success context.
 * @returns Resolves once the original `package.json` has been restored.
 */
export const success = async (pluginConfig: PluginConfig, context: CommonContext): Promise<void> => {
    const cwd = pluginConfig.pkgRoot ? resolve(context.cwd, pluginConfig.pkgRoot) : context.cwd;

    const backupPackageJson = join(cwd, "package.json.back");

    if (await isAccessible(backupPackageJson)) {
        const packageJson = await getPackage(pluginConfig, context);

        const backupPackageJsonContent = (await readJson(backupPackageJson)) as PackageJson;

        // Overwrite the version from the backup package.json
        backupPackageJsonContent.version = packageJson.version;

        await writeJson(join(cwd, "package.json"), backupPackageJsonContent, {
            detectIndent: true,
            overwrite: true,
        });

        await rm(backupPackageJson);

        context.logger.log("Restored modified package.json from backup.");
    } else {
        context.logger.error("No backup package.json found.");
    }
};

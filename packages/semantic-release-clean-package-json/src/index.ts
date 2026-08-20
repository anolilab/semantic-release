import { rm } from "node:fs/promises";

import { isAccessible, readFile, readJson, writeFile } from "@visulima/fs";
import { join, resolve } from "@visulima/path";

import serializeManifest from "../../../shared/serialize-manifest";
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
 
export const publish = async (pluginConfig: PluginConfig, context: PublishContext): Promise<void> => {
    const packageJson = await getPackage(pluginConfig, context);
    const cwd = pluginConfig.pkgRoot ? resolve(context.cwd, pluginConfig.pkgRoot) : context.cwd;
    const packagePath = join(cwd, "package.json");
    // Keep the layout of the manifest we are about to rewrite, so that the backup restored in
    // `success` is byte-identical to what the user committed.
    const packageContent = (await isAccessible(packagePath)) ? await readFile(packagePath) : undefined;

    await writeFile(join(cwd, "package.json.back"), serializeManifest(packageJson, packageContent));

    context.logger.log("Created a backup of the package.json file.");

    const keep = pluginConfig.keep ?? [];
    const keepProperties = new Set([...defaultKeepProperties, ...keep]);

    context.logger.log(`Keeping the following properties: ${[...keepProperties].join(", ")}`);

    const packageJsonCopy = { ...packageJson };

    const removeScriptProperties = () => {
        if (!packageJsonCopy.scripts) {
            return false;
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const script in packageJsonCopy.scripts) {
            if (!keepProperties.has(`scripts.${script}`)) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete packageJsonCopy.scripts[script];
            }
        }

        return Object.keys(packageJsonCopy.scripts).length > 0;
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const property in packageJsonCopy) {
        if (keepProperties.has(property)) {
            continue;
        }

        if (property === "scripts" && removeScriptProperties()) {
            continue;
        }

        context.logger.log(`Removing property "${property}"`);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete packageJsonCopy[property];
    }

    await writeFile(packagePath, serializeManifest(packageJsonCopy, packageContent));
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

        const backupContent = await readFile(backupPackageJson);
        const backupPackageJsonContent = (await readJson(backupPackageJson)) as Record<string, unknown>;

        // Overwrite the version from the backup package.json
        backupPackageJsonContent.version = packageJson.version;

        await writeFile(join(cwd, "package.json"), serializeManifest(backupPackageJsonContent, backupContent));

        await rm(backupPackageJson);

        context.logger.log("Restored modified package.json from backup.");
    } else {
        context.logger.error("No backup package.json found.");
    }
};

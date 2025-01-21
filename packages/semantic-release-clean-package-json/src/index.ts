import { rm } from "node:fs/promises";

import { isAccessible, readJson, writeJson } from "@visulima/fs";
import { join, resolve } from "@visulima/path";
import type { PackageJson } from "type-fest";

import defaultKeepProperties from "./default-keep-properties";
import type { CommonContext, PublishContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getPackage from "./utils/get-pkg";

// eslint-disable-next-line sonarjs/cognitive-complexity
export const publish = async (pluginConfig: PluginConfig, context: PublishContext): Promise<void> => {
    const packageJson = await getPackage(pluginConfig, context);
    const cwd = pluginConfig.pkgRoot ? resolve(context.cwd, pluginConfig.pkgRoot) : context.cwd;

    await writeJson(
        join(cwd, "package.json.back"),
        packageJson,
        {
            detectIndent: true,
        },
    );

    context.logger.log("Backup package.json created.");

    const keepProperties = new Set([...defaultKeepProperties, ...(pluginConfig.keep ?? [])]);

    context.logger.log(`Keeping the following properties: ${[...keepProperties].join(", ")}`);

    const packageJsonCopy = { ...packageJson };

    // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
    for (const property in packageJsonCopy) {
        if (keepProperties.has(property)) {
            // eslint-disable-next-line no-continue
            continue;
        }

        if (property === "scripts") {
            // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
            for (const script in packageJsonCopy.scripts) {
                if (keepProperties.has(`${property}.${script}`)) {
                    // eslint-disable-next-line no-continue
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
                delete packageJsonCopy.scripts[script];
            }

            if (packageJsonCopy.scripts && Object.keys(packageJsonCopy.scripts).length > 0) {
                // eslint-disable-next-line no-continue
                continue;
            }
        }

        context.logger.log(`Removing property "${property}"`);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
        delete packageJsonCopy[property];
    }

    await writeJson(join(cwd, "package.json"), packageJsonCopy, {
        detectIndent: true,
    });
};

export const success = async (pluginConfig: PluginConfig, context: CommonContext): Promise<void> => {
    const cwd = pluginConfig.pkgRoot ? resolve(context.cwd, pluginConfig.pkgRoot) : context.cwd;

    const backupPackageJson = join(cwd, "package.json.back");

    if (await isAccessible(backupPackageJson)) {
        const packageJson = await getPackage(pluginConfig, context);

        const backupPackageJsonContent = (await readJson(backupPackageJson)) as PackageJson;

        await writeJson(
            join(cwd, "package.json"),
            {
                ...backupPackageJsonContent,
                version: packageJson.version,
            },
            {
                detectIndent: true,
                overwrite: true,
            },
        );

        await rm(backupPackageJson);

        context.logger.log("Restored modified package.json from backup.");
    } else {
        context.logger.error("No backup package.json found.");
    }
};

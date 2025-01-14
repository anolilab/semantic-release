import { writeJson } from "@visulima/fs";
import { join } from "@visulima/path";

import defaultKeepProperties from "./default-keep-properties";
import type { PrepareContext } from "./definitions/context";
import type { PluginConfig } from "./definitions/plugin-config";
import getPackage from "./utils/get-pkg";

// eslint-disable-next-line sonarjs/cognitive-complexity,import/prefer-default-export
export const prepare = async (pluginConfig: PluginConfig, context: PrepareContext): Promise<void> => {
    const packageJson = await getPackage(pluginConfig, context);

    const keepProperties = new Set([...defaultKeepProperties, ...(pluginConfig.keep ?? [])]);

    context.logger.log(`Keeping the following properties: ${[...keepProperties].join(", ")}`);

    // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
    for (const property in packageJson) {
        if (keepProperties.has(property)) {
            // eslint-disable-next-line no-continue
            continue;
        }

        if (property === "scripts") {
            // eslint-disable-next-line no-loops/no-loops,no-restricted-syntax
            for (const script in packageJson.scripts) {
                if (keepProperties.has(`${property}.${script}`)) {
                    // eslint-disable-next-line no-continue
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
                delete packageJson.scripts[script];
            }

            if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
                // eslint-disable-next-line no-continue
                continue;
            }
        }

        context.logger.log(`Removing property "${property}"`);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
        delete packageJson[property];
    }

    await writeJson(join(context.cwd, "package.json"), packageJson, {
        detectIndent: true,
    });
};

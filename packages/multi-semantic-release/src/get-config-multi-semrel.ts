import { createRequire } from "node:module";

import { cosmiconfig } from "cosmiconfig";
// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array
import { castArray } from "lodash-es";
import resolveFrom from "resolve-from";

import type { Flags, MultiReleaseConfig } from "./types";
import mergeConfig from "./utils/merge-config";

const CONFIG_NAME = "multi-release";
const CONFIG_FILES = [
    "package.json",
    `.${CONFIG_NAME}rc`,
    `.${CONFIG_NAME}rc.json`,
    `.${CONFIG_NAME}rc.yaml`,
    `.${CONFIG_NAME}rc.yml`,
    `.${CONFIG_NAME}rc.js`,
    `.${CONFIG_NAME}rc.cjs`,
    `.${CONFIG_NAME}rc.mjs`,
    `${CONFIG_NAME}.config.js`,
    `${CONFIG_NAME}.config.cjs`,
    `${CONFIG_NAME}.config.mjs`,
];

/**
 * Get the multi semantic release configuration options for a given directory.
 * @param cwd The directory to search.
 * @param cliOptions cli supplied options.
 * @returns The found configuration option
 * @internal
 */
const getConfigMultiSemrel = async (cwd: string, cliOptions: Flags): Promise<MultiReleaseConfig> => {
    const { config } = await cosmiconfig(CONFIG_NAME, { searchPlaces: CONFIG_FILES }).search(cwd) || {};
    const { extends: extendPaths, ...rest } = { ...config };

    let options: MultiReleaseConfig = rest;

    if (extendPaths) {
        const require = createRequire(import.meta.url);
        // eslint-disable-next-line unicorn/no-array-reduce
        const extendedOptions: MultiReleaseConfig = castArray(extendPaths).reduce((result: MultiReleaseConfig, extendPath: string) => {
            // eslint-disable-next-line import/no-dynamic-require
            const extendsOptions: MultiReleaseConfig = require(resolveFrom(cwd, extendPath));

            return mergeConfig(result, extendsOptions);
        }, {} as MultiReleaseConfig);

        options = mergeConfig(options, extendedOptions);
    }

    options = mergeConfig(
        {
            branches: undefined,
            ci: undefined,
            debug: false,
            deps: {
                bump: "override" as const,
                prefix: "",
                release: "patch" as const,
            },
            dryRun: undefined,
            firstParent: false,
            ignorePackages: [],
            ignorePrivate: true,
            sequentialInit: false,
            sequentialPrepare: true,
            silent: false,
            // eslint-disable-next-line no-template-curly-in-string
            tagFormat: "${name}@${version}",
        } as MultiReleaseConfig,
        options,
    );

    return mergeConfig(options, cliOptions);
};

export default getConfigMultiSemrel;

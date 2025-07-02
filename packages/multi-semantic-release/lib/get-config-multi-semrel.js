import { createRequire } from "node:module";

import { cosmiconfig } from "cosmiconfig";
// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array
import { castArray } from "lodash-es";
import resolveFrom from "resolve-from";

import mergeConfig from "./utils/merge-config.js";

const CONFIG_NAME = "multi-release";
const CONFIG_FILES = [
    "package.json",
    `.${CONFIG_NAME}rc`,
    `.${CONFIG_NAME}rc.json`,
    `.${CONFIG_NAME}rc.yaml`,
    `.${CONFIG_NAME}rc.yml`,
    `.${CONFIG_NAME}rc.js`,
    `.${CONFIG_NAME}rc.cjs`,
    `${CONFIG_NAME}.config.js`,
    `${CONFIG_NAME}.config.cjs`,
];

/**
 * Get the multi semantic release configuration options for a given directory.
 * @param {string} cwd The directory to search.
 * @param {object} cliOptions cli supplied options.
 * @returns {object} The found configuration option
 * @internal
 */
export default async function getConfig(cwd, cliOptions) {
    const { config } = await cosmiconfig(CONFIG_NAME, { searchPlaces: CONFIG_FILES }).search(cwd) || {};
    const { extends: extendPaths, ...rest } = { ...config };

    let options = rest;

    if (extendPaths) {
        const require = createRequire(import.meta.url);
        // If `extends` is defined, load and merge each shareable config
        // eslint-disable-next-line unicorn/no-array-reduce
        const extendedOptions = castArray(extendPaths).reduce((result, extendPath) => {
            // eslint-disable-next-line import/no-dynamic-require,security/detect-non-literal-require
            const extendsOptions = require(resolveFrom(cwd, extendPath));

            return mergeConfig(result, extendsOptions);
        }, {});

        options = mergeConfig(options, extendedOptions);
    }

    // Set default options values if not defined yet
    options = mergeConfig(
        {
            branches: undefined,
            ci: undefined,
            debug: false,
            deps: {
                bump: "override",
                prefix: "",
                release: "patch",
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
        },
        options,
    );

    // Finally merge CLI options last so they always win
    return mergeConfig(options, cliOptions);
}

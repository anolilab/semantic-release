import { cosmiconfig } from "cosmiconfig";

const CONFIG_NAME = "release";
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
 * Get the release configuration options for a given directory.
 * @param cwd The directory to search.
 * @returns The found configuration option
 * @internal
 */
const getConfig = async (cwd: string): Promise<Record<string, unknown>> => {
    const config = await cosmiconfig(CONFIG_NAME, { mergeSearchPlaces: false, searchPlaces: CONFIG_FILES }).search(cwd);

    // Not important
    return config?.config ?? {};
};

export default getConfig;

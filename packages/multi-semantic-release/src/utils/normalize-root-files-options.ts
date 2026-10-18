import logger from "../logger";
import type { MultiReleaseConfig } from "../types";

/** The flat root file options released in 4.5.0, by the `rootFiles` option that replaces them. */
const DEPRECATED_ROOT_FILES_OPTIONS = {
    rootFilesPackages: "packages",
    rootFilesReleaseType: "release",
    rootFilesScope: "scope",
    triggerRootFiles: "files",
} as const;

type DeprecatedRootFilesOption = keyof typeof DEPRECATED_ROOT_FILES_OPTIONS;

const isSet = (value: unknown): boolean => value !== undefined && value !== null;

const toKebabCase = (value: string): string => value.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

/**
 * Move the deprecated flat root file options (`triggerRootFiles`, `rootFilesScope`, `rootFilesPackages`,
 * `rootFilesReleaseType`) into `rootFiles`, warning about each one used. A `rootFiles` option set as well wins.
 * @param options The options from one source, e.g. the config file or the CLI.
 * @returns The options without the flat root file options.
 */
const normalizeRootFilesOptions = (options: MultiReleaseConfig): MultiReleaseConfig => {
    const used = (Object.keys(DEPRECATED_ROOT_FILES_OPTIONS) as DeprecatedRootFilesOption[]).filter((key) => isSet(options[key]));

    if (used.length === 0) {
        return options;
    }

    const rootFiles: Record<string, unknown> = { ...options.rootFiles };
    const normalized: MultiReleaseConfig = { ...options };

    for (const key of used) {
        const replacement = DEPRECATED_ROOT_FILES_OPTIONS[key];

        logger.warn(
            `[multi-semantic-release]: "${key}" (--${toKebabCase(key)}) is deprecated, use "rootFiles.${replacement}" (--root-files.${replacement}) instead.`,
        );

        if (!isSet(rootFiles[replacement])) {
            rootFiles[replacement] = options[key];
        }

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete normalized[key];
    }

    return { ...normalized, rootFiles };
};

export default normalizeRootFilesOptions;

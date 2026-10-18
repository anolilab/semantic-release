// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array, e18e/ban-dependencies
import { castArray, pickBy } from "lodash-es";

const isNil = (value: unknown): boolean => value === undefined || value === null;

const mergeArrays = (a: unknown, b: unknown): unknown[] => [...new Set([...castArray(a ?? []), ...castArray(b ?? [])])];

// Array options of rootFiles, merged like ignorePackages
const ROOT_FILES_ARRAY_OPTIONS = ["files", "packages"] as const;

/**
 * Merge two rootFiles options like the top-level options: unset values are skipped, arrays are merged.
 * @param a The rootFiles options so far.
 * @param b The rootFiles options to merge in.
 * @returns The merged rootFiles options.
 */
const mergeRootFiles = (a: Record<string, unknown> = {}, b: Record<string, unknown> = {}): Record<string, unknown> => {
    return {
        ...a,
        ...pickBy(b, (option: unknown) => !isNil(option)),
        ...Object.fromEntries(ROOT_FILES_ARRAY_OPTIONS.filter((key) => !isNil(a[key]) || !isNil(b[key])).map((key) => [key, mergeArrays(a[key], b[key])])),
    };
};

const mergeConfig = (a: Record<string, unknown> = {}, b: Record<string, unknown> = {}): Record<string, unknown> => {
    const rootFiles =
        isNil(a.rootFiles) && isNil(b.rootFiles)
            ? {}
            : { rootFiles: mergeRootFiles(a.rootFiles as Record<string, unknown> | undefined, b.rootFiles as Record<string, unknown> | undefined) };

    return {
        ...a,
        // Remove `null` and `undefined` options so they can be replaced with default ones
        ...pickBy(b, (option: unknown) => !isNil(option)),
        // Treat nested objects differently as otherwise we'll loose undefined keys
        deps: {
            ...(a.deps as Record<string, unknown>),
            ...pickBy(b.deps as Record<string, unknown>, (option: unknown) => !isNil(option)),
        },
        // Treat arrays differently by merging them
        ignorePackages: mergeArrays(a.ignorePackages, b.ignorePackages),
        ...rootFiles,
    };
};

export default mergeConfig;

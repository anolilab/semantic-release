// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array, e18e/ban-dependencies
import { castArray, pickBy } from "lodash-es";

const isNil = (value: unknown): boolean => value === undefined || value === null;

const mergeArrays = (a: unknown, b: unknown): unknown[] => [...new Set([...castArray(a ?? []), ...castArray(b ?? [])])];

// Optional array options, merged like ignorePackages but only present when set
const OPTIONAL_ARRAY_OPTIONS = ["rootFilesPackages", "triggerRootFiles"] as const;

const mergeConfig = (a: Record<string, unknown> = {}, b: Record<string, unknown> = {}): Record<string, unknown> => {
    const optionalArrays = Object.fromEntries(
        OPTIONAL_ARRAY_OPTIONS.filter((key) => !isNil(a[key]) || !isNil(b[key])).map((key) => [key, mergeArrays(a[key], b[key])]),
    );

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
        ...optionalArrays,
    };
};

export default mergeConfig;

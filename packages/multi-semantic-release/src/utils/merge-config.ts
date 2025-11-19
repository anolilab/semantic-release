// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array
import { castArray, pickBy } from "lodash-es";

const isNil = (value: unknown): boolean => value === undefined || value === null;

const mergeConfig = (a: Record<string, unknown> = {}, b: Record<string, unknown> = {}): Record<string, unknown> => {
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
        ignorePackages: [...new Set([...castArray(a.ignorePackages || []), ...castArray(b.ignorePackages || [])])],
    };
};

export default mergeConfig;

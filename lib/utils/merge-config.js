// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array
import { castArray, pickBy } from "lodash-es";

const isNil = (value) => value == null;

const mergeConfig = (a = {}, b = {}) => {
    return {
        ...a,
        // Remove `null` and `undefined` options so they can be replaced with default ones
        ...pickBy(b, (option) => !isNil(option)),
        // Treat nested objects differently as otherwise we'll loose undefined keys
        deps: {
            ...a.deps,
            ...pickBy(b.deps, (option) => !isNil(option)),
        },
        // Treat arrays differently by merging them
        ignorePackages: [...new Set([...castArray(a.ignorePackages || []), ...castArray(b.ignorePackages || [])])],
    };
};

export default mergeConfig;

/**
 * Return the cached promise for a key, loading and caching it on first use.
 * @param cache The cache to read from and write to.
 * @param key The cache key.
 * @param load Loads the value when the key isn't cached yet.
 * @returns The cached or newly loaded promise.
 */
const memoize = <T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> => {
    let value = cache.get(key);

    if (!value) {
        value = load();
        cache.set(key, value);
    }

    return value;
};

export default memoize;

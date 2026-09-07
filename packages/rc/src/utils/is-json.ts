/**
 * Checks whether a value reads as parseable JSON.
 *
 * Takes `unknown` rather than `string` because file contents are not the only
 * thing that reaches it, and `JSON.parse` coerces its argument to a string
 * anyway — `String(value)` just makes that step visible instead of implicit.
 * @param value
 * @returns
 */
const isJson = (value: unknown): boolean => {
    try {
        JSON.parse(String(value));
    } catch {
        return false;
    }

    return true;
};

export default isJson;

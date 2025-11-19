import { isAbsolute, join, normalize, parse } from "node:path";

import { validate } from "./validate";

/**
 * Normalize and make a path absolute, optionally using a custom CWD.
 * Trims any trailing slashes from the path.
 * @param path The path to normalize and make absolute.
 * @param cwd The CWD to prepend to the path to make it absolute.
 * @returns The absolute and normalized path.
 * @internal
 */
const cleanPath = (path: string, cwd: string = process.cwd()): string => {
    validate(path, "path: path");
    validate(cwd, "cwd: absolute");

    const normalized = normalize(isAbsolute(path) ? path : join(cwd, path));
    const { root } = parse(normalized);

    let end = normalized.length;

    while (end > root.length && (normalized[end - 1] === "/" || normalized[end - 1] === "\\")) {
        end -= 1;
    }

    return end === normalized.length ? normalized : normalized.slice(0, end);
};

export default cleanPath;

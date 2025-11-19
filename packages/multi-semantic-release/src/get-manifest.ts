import { existsSync, lstatSync, readFileSync } from "node:fs";

import type { PackageManifest } from "./types";

/**
 * Read the content of target package.json if exists.
 * @param path file path
 * @returns file content
 * @internal
 */
const readManifest = (path: string): string => {
    if (!existsSync(path)) {
        throw new ReferenceError(`package.json file not found: "${path}"`);
    }

    let stat: ReturnType<typeof lstatSync>;

    try {
        stat = lstatSync(path);
    } catch {
        // istanbul ignore next (hard to __tests__ — happens if no read access etc).
        throw new ReferenceError(`package.json cannot be read: "${path}"`);
    }

    if (!stat.isFile()) {
        throw new ReferenceError(`package.json is not a file: "${path}"`);
    }

    try {
        return readFileSync(path, "utf8");
    } catch {
        // istanbul ignore next (hard to __tests__ — happens if no read access etc).
        throw new ReferenceError(`package.json cannot be read: "${path}"`);
    }
};

/**
 * Get the parsed contents of a package.json manifest file.
 * @param path The path to the package.json manifest file.
 * @returns The manifest file's contents.
 * @internal
 */
const getManifest = (path: string): PackageManifest => {
    const contents = readManifest(path);

    let manifest: unknown;

    try {
        manifest = JSON.parse(contents);
    } catch {
        throw new SyntaxError(`package.json could not be parsed: "${path}"`);
    }

    if (typeof manifest !== "object" || manifest === null) {
        throw new SyntaxError(`package.json was not an object: "${path}"`);
    }

    const manifestTyped = manifest as PackageManifest;

    if (typeof manifestTyped.name !== "string" || manifestTyped.name.length === 0) {
        throw new SyntaxError(`Package name must be non-empty string: "${path}"`);
    }

    const checkDeps = (scope: string) => {
        if (Object.prototype.hasOwnProperty.call(manifestTyped, scope) && typeof manifestTyped[scope as keyof PackageManifest] !== "object") {
            throw new SyntaxError(`Package ${scope} must be object: "${path}"`);
        }
    };

    checkDeps("dependencies");
    checkDeps("devDependencies");
    checkDeps("peerDependencies");
    checkDeps("optionalDependencies");

    Object.defineProperty(manifestTyped, "__contents__", { enumerable: false, value: contents });

    return manifestTyped;
};

export default getManifest;

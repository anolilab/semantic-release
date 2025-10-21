import { existsSync, lstatSync, readFileSync } from "node:fs";

import type { PackageManifest } from "./types";

/**
 * Read the content of target package.json if exists.
 * @param path file path
 * @returns file content
 * @internal
 */
const readManifest = (path: string): string => {
    // Check it exists.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!existsSync(path)) {
        throw new ReferenceError(`package.json file not found: "${path}"`);
    }

    // Stat the file.
    let stat: ReturnType<typeof lstatSync>;

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        stat = lstatSync(path);
    } catch {
        // istanbul ignore next (hard to __tests__ — happens if no read access etc).
        throw new ReferenceError(`package.json cannot be read: "${path}"`);
    }

    // Check it's a file!
    if (!stat.isFile()) {
        throw new ReferenceError(`package.json is not a file: "${path}"`);
    }

    // Read the file.
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
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
export default (path: string): PackageManifest => {
    // Read the file.
    const contents = readManifest(path);

    // Parse the file.
    let manifest: unknown;

    try {
        manifest = JSON.parse(contents);
    } catch {
        throw new SyntaxError(`package.json could not be parsed: "${path}"`);
    }

    // Must be an object.
    if (typeof manifest !== "object" || manifest === null) {
        throw new SyntaxError(`package.json was not an object: "${path}"`);
    }

    // Must have a name.
    if (typeof (manifest as PackageManifest).name !== "string" || (manifest as PackageManifest).name!.length === 0) {
        throw new SyntaxError(`Package name must be non-empty string: "${path}"`);
    }

    // Check dependencies.
    const checkDeps = (scope: string) => {
        if ((manifest as PackageManifest).hasOwnProperty!(scope) && typeof (manifest as PackageManifest)[scope as keyof PackageManifest] !== "object") {
            throw new SyntaxError(`Package ${scope} must be object: "${path}"`);
        }
    };

    checkDeps("dependencies");
    checkDeps("devDependencies");
    checkDeps("peerDependencies");
    checkDeps("optionalDependencies");

    // NOTE non-enumerable prop is skipped by JSON.stringify
    Object.defineProperty(manifest, "__contents__", { enumerable: false, value: contents });

    // Return contents.
    return manifest as PackageManifest;
};

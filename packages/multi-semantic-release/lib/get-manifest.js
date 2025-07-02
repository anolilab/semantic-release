import { existsSync, lstatSync, readFileSync } from "node:fs";

/**
 * Read the content of target package.json if exists.
 * @param {string} path file path
 * @returns {string} file content
 * @internal
 */
function readManifest(path) {
    // Check it exists.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!existsSync(path)) {
        throw new ReferenceError(`package.json file not found: "${path}"`);
    }

    // Stat the file.
    let stat;

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
}

/**
 * Get the parsed contents of a package.json manifest file.
 * @param {string} path The path to the package.json manifest file.
 * @returns {object} The manifest file's contents.
 * @internal
 */
export default function getManifest(path) {
    // Read the file.
    const contents = readManifest(path);

    // Parse the file.
    let manifest;

    try {
        manifest = JSON.parse(contents);
    } catch {
        throw new SyntaxError(`package.json could not be parsed: "${path}"`);
    }

    // Must be an object.
    if (typeof manifest !== "object") {
        throw new SyntaxError(`package.json was not an object: "${path}"`);
    }

    // Must have a name.
    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
        throw new SyntaxError(`Package name must be non-empty string: "${path}"`);
    }

    // Check dependencies.
    const checkDeps = (scope) => {
        // eslint-disable-next-line no-prototype-builtins,security/detect-object-injection
        if (manifest.hasOwnProperty(scope) && typeof manifest[scope] !== "object") {
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
    return manifest;
}

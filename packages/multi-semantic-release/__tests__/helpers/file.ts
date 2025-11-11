import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Is given path a directory?

/**
 * @param path
 */
export const isDirectory = (path: string): boolean =>
    // String path that exists and is a directory.
    typeof path === "string" && existsSync(path) && lstatSync(path).isDirectory()
;

// Deep copy a directory.

/**
 * @param source
 * @param target
 */
export const copyDirectory = (source: string, target: string): void => {
    if (!isDirectory(source)) {
        throw new Error("copyDirectory(): source must be an existant directory");
    }

    if (!isDirectory(target)) {
        // Try making it now (Tempy doesn't actually make the dir, just generates the path).
        mkdirSync(target);

        // If it doesn't exist after that there's an issue.
        if (!isDirectory(target)) {
            throw new Error("copyDirectory(): target must be an existant directory");
        }
    }

    // Copy every file and dir in the dir.
    readdirSync(source).forEach((name) => {
        // Get full paths.
        const sourceFile = join(source, name);
        const targetFile = join(target, name);

        // Directory or file?
        if (isDirectory(sourceFile)) {
            // Possibly make directory.

            if (!existsSync(targetFile)) {
                mkdirSync(targetFile);
            }

            // Recursive copy directory.
            copyDirectory(sourceFile, targetFile);
        } else {
            // Copy file.
            copyFileSync(sourceFile, targetFile);
        }
    });
};

// Creates testing files on all specified folders.

/**
 * @param folders
 * @param cwd
 */
export const createNewTestingFiles = (folders: string[], cwd: string): void => {
    folders.forEach((fld) => {
        // eslint-disable-next-line sonarjs/pseudo-random
        writeFileSync(`${cwd}/${fld}test.txt`, `${fld}${Math.random()}`);
    });
};

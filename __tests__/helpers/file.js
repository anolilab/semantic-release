import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Is given path a directory?
export function isDirectory(path) {
    // String path that exists and is a directory.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return typeof path === "string" && existsSync(path) && lstatSync(path).isDirectory();
}

// Deep copy a directory.
export function copyDirectory(source, target) {
    if (!isDirectory(source)) {
        throw new Error("copyDirectory(): source must be an existant directory");
    }

    if (!isDirectory(target)) {
        // Try making it now (Tempy doesn't actually make the dir, just generates the path).
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        mkdirSync(target);
        // If it doesn't exist after that there's an issue.
        if (!isDirectory(target)) {
            throw new Error("copyDirectory(): target must be an existant directory");
        }
    }

    // Copy every file and dir in the dir.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    readdirSync(source).forEach((name) => {
        // Get full paths.
        const sourceFile = join(source, name);
        const targetFile = join(target, name);

        // Directory or file?
        if (isDirectory(sourceFile)) {
            // Possibly make directory.
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (!existsSync(targetFile)) {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                mkdirSync(targetFile);
            }
            // Recursive copy directory.
            copyDirectory(sourceFile, targetFile);
        } else {
            // Copy file.
            copyFileSync(sourceFile, targetFile);
        }
    });
}

// Creates testing files on all specified folders.
export function createNewTestingFiles(folders, cwd) {
    folders.forEach((fld) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        writeFileSync(`${cwd}/${fld}test.txt`, `${fld}${Math.random()}`);
    });
}

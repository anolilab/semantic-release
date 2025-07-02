// eslint-disable-next-line unicorn/prevent-abbreviations
import type { FindUpOptions } from "@visulima/fs";
import { findUp, readJson } from "@visulima/fs";
import { NotFoundError } from "@visulima/fs/error";
import { resolve } from "@visulima/path";
import type { PackageJson } from "type-fest";

import type { CommonContext } from "../definitions/context";
import getError from "./get-error";

/**
 * Locate the closest `package.json` starting from the provided directory and return its parsed
 * contents together with the absolute file path.
 *
 * @private
 *
 * @param {string | URL | undefined} [cwd] Directory to start searching in. When omitted the current
 *        working directory is used.
 *
 * @returns {Promise<{packageJson: PackageJson; path: string}>} Resolves with the parsed JSON object
 *          and its path or rejects with {@link NotFoundError} if no file could be found.
 */
const findPackageJson = async (
    cwd?: URL | string,
): Promise<{
    packageJson: PackageJson;
    path: string;
}> => {
    const findUpConfig: FindUpOptions = {
        type: "file",
    };

    if (cwd) {
        findUpConfig.cwd = cwd;
    }

    const filePath = await findUp("package.json", findUpConfig);

    if (!filePath) {
        throw new NotFoundError("No such file or directory, for package.json found.");
    }

    return {
        packageJson: await readJson<PackageJson>(filePath),
        path: filePath,
    };
};

/**
 * Read and validate the `package.json` file for the current project (or a sub-path defined via
 * `pkgRoot`). A semantic-release compatible {@link AggregateError} is thrown when either the file is
 * missing or it does not contain a `name` field.
 *
 * @param {{ pkgRoot?: string }} options     Plugin options containing an optional `pkgRoot` that
 *                                           points to the publish sub-directory.
 * @param {{ cwd: string }}       context     Semantic-release context providing the base cwd.
 *
 * @returns {Promise<PackageJson>} The parsed package.json object.
 */
export default async (
    {
        pkgRoot,
    }: {
        pkgRoot?: string;
    },
    { cwd }: { cwd: CommonContext["cwd"] },
): Promise<PackageJson> => {
    try {
        const { packageJson } = await findPackageJson(pkgRoot ? resolve(cwd, pkgRoot) : cwd);

        if (!packageJson.name) {
            const semanticError = getError("ENOPKGNAME");

            throw new AggregateError([semanticError], semanticError.message);
        }

        return packageJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.code === "ENOENT") {
            const semanticError = getError("ENOPKG");

            throw new AggregateError([semanticError], semanticError.message);
        }

        throw error;
    }
};

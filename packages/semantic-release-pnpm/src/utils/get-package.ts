import type { PackageJson } from "@visulima/package";
import { findPackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";

import type { CommonContext } from "../definitions/context";
import getError from "./get-error";

interface Options {
    pkgRoot?: string;
}

/**
 * Locate and read the `package.json` for the current project (or the sub-directory specified by
 * `pkgRoot`). Ensures that the manifest contains a `name` field and throws semantic-release style
 * errors otherwise (for better aggregation in the caller).
 * @param options – Options object containing an optional `pkgRoot` path.
 * @param options.pkgRoot The publish sub-directory.
 * @param context – Semantic-release context limited to the `cwd` property.
 * @param context.cwd The base cwd.
 * @returns The parsed `package.json` object.
 */
const getPackage = async ({ pkgRoot }: Options, { cwd }: { cwd: CommonContext["cwd"] }): Promise<PackageJson> => {
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

export default getPackage;

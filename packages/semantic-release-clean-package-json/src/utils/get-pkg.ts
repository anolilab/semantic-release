// eslint-disable-next-line unicorn/prevent-abbreviations
import type { FindUpOptions } from "@visulima/fs";
import { findUp, readJson } from "@visulima/fs";
import { NotFoundError } from "@visulima/fs/error";
import { resolve } from "@visulima/path";
import type { PackageJson } from "type-fest";

import type { CommonContext } from "../definitions/context";
import getError from "./get-error";

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

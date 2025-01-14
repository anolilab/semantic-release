// eslint-disable-next-line unicorn/prevent-abbreviations
import { resolve } from "@visulima/path";
import AggregateError from "aggregate-error";
import type { PackageJson } from "type-fest";

import type { CommonContext } from "../definitions/context";
import getError from "./get-error";
import { findUp, type FindUpOptions, readJson } from "@visulima/fs";
import { NotFoundError } from "@visulima/fs/error";

export const findPackageJson = async (
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

    const output = {
        packageJson: await readJson<PackageJson>(filePath),
        path: filePath,
    };

    return output;
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
            throw new AggregateError([getError("ENOPKGNAME")]);
        }

        return packageJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.code === "ENOENT") {
            throw new AggregateError([getError("ENOPKG")]);
        }

        throw error;
    }
};

// eslint-disable-next-line unicorn/prevent-abbreviations
import type { PackageJson } from "@visulima/package";
import { findPackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";
import AggregateError from "aggregate-error";

import type { CommonContext } from "../definitions/context";
import getError from "./get-error";

interface Options {
    pkgRoot?: string;
}

export default async ({ pkgRoot }: Options, { cwd }: { cwd: CommonContext["cwd"] }): Promise<PackageJson> => {
    try {
        const { packageJson } = await findPackageJson(pkgRoot ? resolve(cwd, pkgRoot) : cwd);

        if (!packageJson.name) {
            throw new AggregateError([getError("ENOPKGNAME")]);
        }

        return packageJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.code === "ENOENT") {
            throw new AggregateError([getError("ENOPKG")]);
        }

        throw error;
    }
};

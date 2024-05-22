import { getPackageManagerVersion } from "@visulima/package";
import AggregateError from "aggregate-error";
import { gte } from "semver";

import type { CommonContext } from "../definitions/context";
import getError from "../utils/get-error";

const MIN_PNPM_VERSION = "8.0.0";

export default async function verifyPnpm({ logger }: CommonContext): Promise<void> {
    logger.log(`Verify pnpm version is >= ${MIN_PNPM_VERSION}`);

    const version = await getPackageManagerVersion("pnpm");

    if (version === undefined) {
        throw new AggregateError([new Error("pnpm is not installed")]);
    }

    if (gte(MIN_PNPM_VERSION, version)) {
        throw new AggregateError([getError("EINVALIDPNPM", { version: String(version) })]);
    }
}
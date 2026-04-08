import { getPackageManagerVersion } from "@visulima/package";
import dbg from "debug";
import { gte } from "semver";

import type { CommonContext } from "../definitions/context";
import getError from "../utils/get-error";

const debug = dbg("semantic-release-pnpm:verify-pnpm");
const MIN_PNPM_VERSION = "8.0.0";

/**
 * Ensure that the `pnpm` CLI available on the system meets the minimum version requirement for the
 * plugin. The current version is resolved via `@visulima/package` and compared to a hard-coded
 * semantic version threshold.
 *
 * When the version is lower than {@link MIN_PNPM_VERSION} a semantic-release error `EINVALIDPNPM` is
 * thrown so that the release process aborts with a clear message.
 * @param context – semantic-release context providing a logger instance.
 * @param context.logger The logger instance.
 * @throws {AggregateError} When the installed pnpm version is below the minimum requirement.
 */
const verifyPnpm = ({ logger }: CommonContext): void => {
    logger.log(`Verify pnpm version is >= ${MIN_PNPM_VERSION}`);

    const version = getPackageManagerVersion("pnpm");

    debug(`Detected pnpm version: ${version}`);

    if (gte(MIN_PNPM_VERSION, version)) {
        debug(`pnpm version ${version} is below minimum required version ${MIN_PNPM_VERSION}`);
        const semanticError = getError("EINVALIDPNPM", { version });

        throw new AggregateError([semanticError], semanticError.message);
    }

    debug(`pnpm version ${version} meets minimum requirement (>= ${MIN_PNPM_VERSION})`);
};

export default verifyPnpm;

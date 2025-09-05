import type { PackageJson } from "@visulima/package";
import { execa } from "execa";
import normalizeUrl from "normalize-url";

import type { CommonContext } from "../definitions/context";
import getError from "../utils/get-error";
import getRegistry from "../utils/get-registry";
import setNpmrcAuth from "../utils/set-npmrc-auth";

/**
 * Verify that the provided npm credentials grant access to the target registry.
 *
 * The helper first ensures that `npmrc` contains valid authentication data by delegating to
 * {@link setNpmrcAuth}. When the registry equals the default public npm registry the function runs
 * `pnpm whoami` to perform an online verification of the credentials. For custom registries the
 * online check is skipped because it might not be supported.
 * @param npmrc – Path to the `.npmrc` that contains (or will receive) credentials.
 * @param package_ – The package manifest (used to derive the registry when `publishConfig.registry` is set).
 * @param context – semantic-release context providing env, logger, streams, etc.
 * @returns Resolves when authentication has been verified.
 */
export default async (npmrc: string, package_: PackageJson, context: CommonContext): Promise<void> => {
    const {
        cwd,
        env: { DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org/", ...environment },
        logger,
        stderr,
        stdout,
    } = context;
    const registry = getRegistry(package_, context);

    await setNpmrcAuth(npmrc, registry, context);

    if (normalizeUrl(registry) === normalizeUrl(DEFAULT_NPM_REGISTRY)) {
        try {
            logger.log(`Running "pnpm whoami" to verify authentication on registry "${registry}"`);

            const whoamiResult = execa("pnpm", ["whoami", "--userconfig", npmrc, "--registry", registry], {
                cwd,
                env: environment,
                preferLocal: true,
            });

            whoamiResult.stdout.pipe(stdout, { end: false });
            whoamiResult.stderr.pipe(stderr, { end: false });

            await whoamiResult;
        } catch {
            const semanticError = getError("EINVALIDNPMTOKEN", { registry });

            throw new AggregateError([semanticError], semanticError.message);
        }
    } else {
        logger.log(`Skipping authentication verification for non-default registry "${registry}"`);
    }
};

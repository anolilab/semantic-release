import type { PackageJson } from "@visulima/package";
import { execa } from "execa";
import normalizeUrl from "normalize-url";

import type { CommonContext } from "../definitions/context";
import getError from "../utils/get-error";
import getRegistry from "../utils/get-registry";
import setNpmrcAuth from "../utils/set-npmrc-auth";

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

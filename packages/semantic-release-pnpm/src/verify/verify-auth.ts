import type { PackageJson } from "@visulima/package";
import { execa } from "execa";
import normalizeUrl from "normalize-url";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import oidcContextEstablished from "../trusted-publishing/oidc-context";
import getError from "../utils/get-error";
import getRegistry from "../utils/get-registry";
import setNpmrcAuth from "../utils/set-npmrc-auth";

/**
 * Verify authentication context against the official npm registry using pnpm whoami.
 * @param npmrc Path to the .npmrc file.
 * @param registry The registry URL.
 * @param context The semantic-release context.
 */
const verifyAuthContextAgainstRegistry = async (npmrc: string, registry: string, context: CommonContext): Promise<void> => {
    const {
        cwd,
        env: { ...environment },
        logger,
        stderr,
        stdout,
    } = context;

    try {
        logger.log(`Running "pnpm whoami" to verify authentication on registry "${registry}"`);

        const whoamiResult = await execa("pnpm", ["whoami", "--userconfig", npmrc, "--registry", registry], {
            cwd,
            env: environment,
            preferLocal: true,
        });

        // Log the output
        if (whoamiResult.stdout) {
            stdout.write(whoamiResult.stdout);
        }

        if (whoamiResult.stderr) {
            stderr.write(whoamiResult.stderr);
        }
    } catch {
        const semanticError = getError("EINVALIDNPMTOKEN", { registry });

        throw new AggregateError([semanticError], semanticError.message);
    }
};

/**
 * Verify that the provided npm credentials grant access to the target registry.
 *
 * The helper first checks if an OIDC context is established for trusted publishing.
 * If OIDC is available and the registry is the official npm registry, it skips further authentication.
 * Otherwise, it ensures that `npmrc` contains valid authentication data by delegating to
 * {@link setNpmrcAuth}. For the official registry, it runs `pnpm whoami` to perform an online
 * verification of the credentials. For custom registries, it performs a dry-run publish to check authentication.
 * @param npmrc – Path to the `.npmrc` that contains (or will receive) credentials.
 * @param package_ – The package manifest (used to derive the registry when `publishConfig.registry` is set).
 * @param context – semantic-release context providing env, logger, streams, etc.
 * @param pkgRoot – Optional package root directory for dry-run publishing.
 * @returns Resolves when authentication has been verified.
 */
const verifyAuth: (npmrc: string, package_: PackageJson, context: CommonContext, pkgRoot?: string) => Promise<void> = async (
    npmrc: string,
    package_: PackageJson,
    context: CommonContext,
): Promise<void> => {
    const registry = getRegistry(package_, context);

    // Check if OIDC context is established for trusted publishing
    if (package_.name && await oidcContextEstablished(registry, package_, context)) {
        return;
    }

    await setNpmrcAuth(npmrc, registry, context);

    const {
        env: { DEFAULT_NPM_REGISTRY = OFFICIAL_REGISTRY },
    } = context;

    // Verify authentication based on registry type
    if (normalizeUrl(registry) === normalizeUrl(DEFAULT_NPM_REGISTRY)) {
        await verifyAuthContextAgainstRegistry(npmrc, registry, context);
    }
};

export default verifyAuth;

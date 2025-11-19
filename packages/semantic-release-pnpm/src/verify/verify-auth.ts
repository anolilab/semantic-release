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
 * Check if an error indicates a connection or timeout issue.
 * @param error The error to check.
 * @returns True if the error is a connection/timeout error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isConnectionError = (error: any): boolean => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code || "";
    const isTimedOut = (error as { timedOut?: boolean })?.timedOut === true;

    return (
        isTimedOut
        || errorCode === "ECONNREFUSED"
        || errorCode === "ETIMEDOUT"
        || errorMessage.includes("ECONNREFUSED")
        || errorMessage.includes("ETIMEDOUT")
        || errorMessage.includes("getaddrinfo ENOTFOUND")
        || errorMessage.includes("timed out")
    );
};

/**
 * Verify authentication context against the official npm registry using pnpm whoami.
 * @param npmrc Path to the .npmrc file.
 * @param registry The registry URL.
 * @param context The semantic-release context.
 */
const verifyAuthContextAgainstRegistry = async (npmrc: string, registry: string, context: CommonContext): Promise<void> => {
    const {
        cwd,
        env,
        logger,
        stderr,
        stdout,
    } = context;

    try {
        logger.log(`Running "pnpm whoami" to verify authentication on registry "${registry}"`);

        const whoamiResult = await execa("pnpm", ["whoami", "--registry", registry], {
            cwd,
            env: {
                ...env,
                NPM_CONFIG_USERCONFIG: npmrc,
            },
            preferLocal: true,
            timeout: 5000, // 5 second timeout to prevent hanging when registry is unavailable
        });

        // Log the output
        if (whoamiResult.stdout) {
            stdout.write(whoamiResult.stdout);
        }

        if (whoamiResult.stderr) {
            stderr.write(whoamiResult.stderr);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // Check for connection errors (registry not available)
        if (isConnectionError(error)) {
            const semanticError = getError("EINVALIDNPMAUTH", { registry });

            throw new AggregateError([semanticError], semanticError.message);
        }

        // Treat other whoami failures as invalid token
        const semanticError = getError("EINVALIDNPMTOKEN", { registry });

        throw new AggregateError([semanticError], semanticError.message);
    }
};

/**
 * Check if an error message indicates an authentication issue.
 * @param message The error message to check.
 * @returns True if the message indicates an auth error.
 */
const isAuthErrorMessage = (message: string): boolean =>
    message.includes("requires you to be logged in")
    || message.includes("authentication")
    || message.includes("Unauthorized")
    || message.includes("401")
    || message.includes("403");

/**
 * Handle errors from publish dry-run command.
 * @param error The error to handle.
 * @param registry The registry URL.
 */
const handlePublishError = (error: unknown, registry: string): never => {
    // If it's already an AggregateError, re-throw it
    if (error instanceof AggregateError) {
        throw error;
    }

    // Check stderr for auth errors (execa errors have stderr property)
    // Handle both string and array formats
    const errorStderrRaw = (error as { stderr?: string | string[] })?.stderr;
    const errorStderr = Array.isArray(errorStderrRaw) ? errorStderrRaw.join("\n") : errorStderrRaw || "";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const combinedMessage = `${errorStderr} ${errorMessage}`;

    // Check for connection errors or timeouts (registry not available) - treat as auth error
    if (isConnectionError(error)) {
        const semanticError = getError("EINVALIDNPMAUTH", { registry });

        throw new AggregateError([semanticError], semanticError.message);
    }

    // Check for authentication errors
    if (isAuthErrorMessage(combinedMessage)) {
        const semanticError = getError("EINVALIDNPMAUTH", { registry });

        throw new AggregateError([semanticError], semanticError.message);
    }

    // Re-throw other errors
    throw error;
};

/**
 * Verify authentication for custom registries using dry-run publish.
 * @param npmrc Path to the .npmrc file.
 * @param registry The registry URL.
 * @param context The semantic-release context.
 * @param pkgRoot Optional package root directory for dry-run publishing.
 */
const verifyAuthContextAgainstCustomRegistry = async (npmrc: string, registry: string, context: CommonContext, pkgRoot = "."): Promise<void> => {
    const {
        cwd,
        env,
        logger,
        stderr,
        stdout,
    } = context;

    try {
        logger.log(`Running "pnpm publish --dry-run" to verify authentication on registry "${registry}"`);

        const publishArgs = ["publish", pkgRoot, "--dry-run", "--tag=semantic-release-auth-check", "--registry", registry];
        const publishOptions = {
            cwd,
            env: {
                ...env,
                NPM_CONFIG_USERCONFIG: npmrc,
            },
            preferLocal: true,
            timeout: 5000, // 5 second timeout to prevent hanging when registry is unavailable
        };

        const publishResult = await execa("pnpm", publishArgs, publishOptions);

        // Log the output (stdout/stderr are strings when lines option is not used)
        const stdoutString = Array.isArray(publishResult.stdout) ? publishResult.stdout.join("\n") : publishResult.stdout || "";
        const stderrString = Array.isArray(publishResult.stderr) ? publishResult.stderr.join("\n") : publishResult.stderr || "";

        if (stdoutString) {
            stdout.write(stdoutString);
        }

        if (stderrString) {
            stderr.write(stderrString);

            // Check for authentication errors in stderr
            if (isAuthErrorMessage(stderrString)) {
                const semanticError = getError("EINVALIDNPMAUTH", { registry });

                throw new AggregateError([semanticError], semanticError.message);
            }
        }
    } catch (error) {
        handlePublishError(error, registry);
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
    pkgRoot?: string,
): Promise<void> => {
    const registry = getRegistry(package_, context);

    // Check if OIDC context is established for trusted publishing
    if (package_.name && await oidcContextEstablished(registry, package_, context)) {
        return;
    }

    await setNpmrcAuth(npmrc, registry, context);

    const normalizedRegistry = normalizeUrl(registry);
    const normalizedOfficialRegistry = normalizeUrl(OFFICIAL_REGISTRY);

    // Verify authentication based on registry type
    // Use whoami only for the official npm registry, use dry-run publish for all other registries
    await (normalizedRegistry === normalizedOfficialRegistry
        ? verifyAuthContextAgainstRegistry(npmrc, registry, context)
        : verifyAuthContextAgainstCustomRegistry(npmrc, registry, context, pkgRoot));
};

export default verifyAuth;

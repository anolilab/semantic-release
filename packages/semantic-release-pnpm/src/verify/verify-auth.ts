import { rc } from "@anolilab/rc";
import { writeFile } from "@visulima/fs";
import type { PackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";
import dbg from "debug";
import { execa } from "execa";
import { stringify } from "ini";
import normalizeUrl from "normalize-url";
import type { AuthOptions } from "registry-auth-token";
import getAuthToken from "registry-auth-token";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import oidcContextEstablished from "../trusted-publishing/oidc-context";
import exchangeToken from "../trusted-publishing/token-exchange";
import getError from "../utils/get-error";
import getRegistry from "../utils/get-registry";
import nerfDart from "../utils/nerf-dart";
import setNpmrcAuth from "../utils/set-npmrc-auth";

const debug = dbg("semantic-release-pnpm:verify-auth");

/**
 * Cache for whoami results to prevent throttling when verifying multiple packages.
 * Key format: `${normalizedRegistry}:${tokenIdentifier}`
 * Value: Promise that resolves when authentication is verified
 */
const whoamiCache = new Map<string, Promise<void>>();

/**
 * Generate a cache key for whoami verification.
 * Uses registry URL and auth token identifier to uniquely identify the auth context.
 * @param registry The registry URL.
 * @param context The semantic-release context containing environment variables.
 * @returns Cache key string.
 */
const getCacheKey = (registry: string, context: CommonContext): string => {
    const normalizedRegistry = normalizeUrl(registry);
    const {
        env: { NPM_PASSWORD, NPM_TOKEN, NPM_USERNAME },
    } = context;

    // Generate cache key based on available auth credentials
    // Use token identifier (first 8 + last 4 chars) for security
    if (NPM_TOKEN) {
        const tokenId = NPM_TOKEN.length > 12 ? `${NPM_TOKEN.slice(0, 8)}...${NPM_TOKEN.slice(-4)}` : NPM_TOKEN.slice(0, 8);

        return `${normalizedRegistry}:token:${tokenId}`;
    }

    if (NPM_USERNAME && NPM_PASSWORD) {
        // Use username as identifier for username/password auth
        return `${normalizedRegistry}:user:${NPM_USERNAME}`;
    }

    // Fallback: try to read from npmrc file (for existing .npmrc files)
    // This handles cases where auth was already configured
    try {
        const { config } = rc("npm", {
            config: context.env.NPM_CONFIG_USERCONFIG ?? resolve(context.cwd, ".npmrc"),
            cwd: context.cwd,
            defaults: { registry: OFFICIAL_REGISTRY },
        });
        const token = getAuthToken(registry, { npmrc: config } as AuthOptions);

        if (token) {
            const tokenId = token.length > 12 ? `${token.slice(0, 8)}...${token.slice(-4)}` : token.slice(0, 8);

            return `${normalizedRegistry}:token:${tokenId}`;
        }
    } catch {
        // If we can't read/parse npmrc, fall back to registry-only key
    }

    return `${normalizedRegistry}:default`;
};

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
 * Results are cached per registry/auth token combination to prevent throttling in monorepos.
 * @param npmrc Path to the .npmrc file.
 * @param registry The registry URL.
 * @param context The semantic-release context.
 */
const verifyAuthContextAgainstRegistry = async (npmrc: string, registry: string, context: CommonContext): Promise<void> => {
    const cacheKey = getCacheKey(registry, context);

    // Check cache first to avoid redundant whoami calls
    if (whoamiCache.has(cacheKey)) {
        debug(`Using cached whoami result for registry "${registry}"`);

        const cachedResult = whoamiCache.get(cacheKey);

        try {
            await cachedResult;

            return;
        } catch {
            // If cached result was an error, remove it from cache and retry
            // This allows recovery from transient errors
            debug(`Cached whoami result failed, retrying for registry "${registry}"`);

            whoamiCache.delete(cacheKey);
        }
    }

    // Create the verification promise
    const verificationPromise = (async (): Promise<void> => {
        const { cwd, env, logger, stderr, stdout } = context;

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
    })();

    // Store in cache (even if it fails, to prevent multiple simultaneous calls)
    whoamiCache.set(cacheKey, verificationPromise);

    try {
        await verificationPromise;
    } catch (error) {
        // Remove from cache on error so it can be retried later
        // Connection errors are removed immediately, auth errors stay cached to prevent repeated failures
        if (isConnectionError(error)) {
            whoamiCache.delete(cacheKey);
        }

        throw error;
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
    const { cwd, env, logger, stderr, stdout } = context;

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
    if (package_.name) {
        debug(`Checking OIDC trusted publishing for package "${package_.name}" on registry "${registry}"`);

        if (await oidcContextEstablished(registry, package_, context)) {
            debug("OIDC trusted publishing verified successfully, exchanging token for npmrc");

            // Exchange OIDC token and write to npmrc for use during publish
            const oidcToken = await exchangeToken({ name: package_.name }, context);

            if (oidcToken) {
                const { config } = rc("npm", {
                    config: context.env.NPM_CONFIG_USERCONFIG ?? resolve(context.cwd, ".npmrc"),
                    cwd: context.cwd,
                    defaults: { registry: OFFICIAL_REGISTRY },
                });

                // Write the OIDC-exchanged token to npmrc
                await writeFile(npmrc, `${Object.keys(config).length > 0 ? `${stringify(config)}\n` : ""}${nerfDart(registry)}:_authToken = ${oidcToken}`);

                debug(`Wrote OIDC-exchanged token to ${npmrc} for use during publish`);
                context.logger.log(`OIDC trusted publishing configured for package "${package_.name}"`);

                return;
            }

            debug("OIDC token exchange failed, falling back to NPM_TOKEN authentication");
        } else {
            debug("OIDC trusted publishing not available, falling back to NPM_TOKEN authentication");
        }
    } else {
        debug("Package name not found, skipping OIDC check and using NPM_TOKEN authentication");
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

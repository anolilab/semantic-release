import { getIDToken } from "@actions/core";
import dbg from "debug";
import type { KnownCiEnv } from "env-ci";
import envCi from "env-ci";

import { GITHUB_ACTIONS_PROVIDER_NAME, OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";

const debug = dbg("semantic-release-pnpm:token-exchange");

/**
 * Exchanges an OIDC ID token for an npm registry token.
 * @param idToken The OIDC ID token to exchange.
 * @param packageName The name of the package to publish.
 * @param context Optional semantic-release context for logging warnings.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeIdToken = async (idToken: string, packageName: string, context?: CommonContext): Promise<string | undefined> => {
    const response = await fetch(`${OFFICIAL_REGISTRY}-/npm/v1/oidc/token/exchange/package/${encodeURIComponent(packageName)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        method: "POST",
    });
    const responseBody = (await response.json()) as { message: string; token: string };

    if (response.ok) {
        debug("OIDC token exchange with the npm registry succeeded");

        return responseBody.token;
    }

    debug(`OIDC token exchange with the npm registry failed: ${String(response.status)} ${responseBody.message}`);

    // Check if the package doesn't exist (404) and provide helpful guidance
    if (response.status === 404 || responseBody.message.toLowerCase().includes("not found")) {
        const warningMessage
            = `Package "${packageName}" does not exist on npm. npm requires a package to exist before you can configure OIDC trusted publishing. `
                + `You can either publish a dummy version manually first (e.g., \`pnpm publish --tag dummy\`) or use the \`setup-npm-trusted-publish\` tool `
                + `(https://github.com/azu/setup-npm-trusted-publish) to create a placeholder package. `
                + `After the package exists, configure OIDC trusted publishing at https://www.npmjs.com/package/${encodeURIComponent(packageName)}/access`;

        context?.logger.error(warningMessage);
        debug(warningMessage);
    }

    return undefined;
};

/**
 * Exchanges a GitHub Actions OIDC token for an npm registry token.
 * @param packageName The name of the package to publish.
 * @param context Optional semantic-release context for logging warnings.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeGithubActionsToken = async (packageName: string, context?: CommonContext): Promise<string | undefined> => {
    let idToken: string | undefined;

    debug("Verifying OIDC context for publishing from GitHub Actions");

    try {
        idToken = await getIDToken("npm:registry.npmjs.org");
    } catch (error) {
        debug(`Retrieval of GitHub Actions OIDC token failed: ${(error as Error).message}`);
        debug("Have you granted the `id-token: write` permission to this workflow?");

        return undefined;
    }

    if (!idToken) {
        debug("GitHub Actions OIDC token is not available");
        debug("Have you granted the `id-token: write` permission to this workflow?");

        return undefined;
    }

    return exchangeIdToken(idToken, packageName, context);
};

/**
 * Exchanges OIDC tokens for supported CI providers.
 *
 * When the `NPM_ID_TOKEN` environment variable is set, it is used directly for token exchange
 * regardless of the CI provider. This enables generic trusted publishing support for any CI
 * provider (e.g. CircleCI, GitLab, etc.) that can provide an OIDC identity token.
 *
 * When `NPM_ID_TOKEN` is not set, falls back to CI-specific token retrieval (GitHub Actions).
 * @param pkg The package information.
 * @param pkg.name The name of the package to publish.
 * @param context The semantic-release context
 * @returns A promise that resolves to the npm token or undefined if no supported CI provider is detected.
 */
const tokenExchange = (pkg: { name: string }, context: CommonContext): Promise<string | undefined> => {
    if (!pkg.name || typeof pkg.name !== "string" || pkg.name.trim() === "") {
        context.logger.error("Invalid package name provided for OIDC token exchange");

        return Promise.resolve(undefined);
    }

    const idToken = process.env.NPM_ID_TOKEN;

    if (idToken) {
        debug("NPM_ID_TOKEN environment variable detected, using it for OIDC token exchange");

        return exchangeIdToken(idToken, pkg.name, context);
    }

    const ciEnv = envCi();
    const ciProviderName: string | undefined = typeof (ciEnv as KnownCiEnv).name === "string" ? (ciEnv as KnownCiEnv).name : undefined;

    if (!ciProviderName) {
        debug("Unable to detect CI provider for OIDC token exchange");

        return Promise.resolve(undefined);
    }

    debug(`Detected CI provider: ${ciProviderName}`);

    if (GITHUB_ACTIONS_PROVIDER_NAME === ciProviderName) {
        return exchangeGithubActionsToken(pkg.name, context);
    }

    debug(`CI provider "${ciProviderName}" does not have built-in OIDC support; set NPM_ID_TOKEN to use trusted publishing`);

    return Promise.resolve(undefined);
};

export default tokenExchange;

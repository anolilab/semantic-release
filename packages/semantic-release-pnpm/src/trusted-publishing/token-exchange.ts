import { getIDToken } from "@actions/core";
import dbg from "debug";
import type { KnownCiEnv } from "env-ci";
import envCi from "env-ci";

import { GITHUB_ACTIONS_PROVIDER_NAME, GITLAB_PIPELINES_PROVIDER_NAME, OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";

const debug = dbg("semantic-release-pnpm:token-exchange");

/**
 * Exchanges an OIDC ID token for an npm registry token.
 * @param idToken The OIDC ID token to exchange.
 * @param packageName The name of the package to publish.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeIdToken = async (idToken: string, packageName: string): Promise<string | undefined> => {
    const response = await fetch(`${OFFICIAL_REGISTRY}-/npm/v1/oidc/token/exchange/package/${encodeURIComponent(packageName)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        method: "POST",
    });
    const responseBody = (await response.json()) as { message: string; token: string };

    if (response.ok) {
        debug("OIDC token exchange with the npm registry succeeded");

        return responseBody.token;
    }

    debug(`OIDC token exchange with the npm registry failed: ${response.status} ${responseBody.message}`);

    return undefined;
};

/**
 * Exchanges a GitHub Actions OIDC token for an npm registry token.
 * @param packageName The name of the package to publish.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeGithubActionsToken = async (packageName: string): Promise<string | undefined> => {
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

    return exchangeIdToken(idToken, packageName);
};

/**
 * Exchanges a GitLab Pipelines OIDC token for an npm registry token.
 * @param packageName The name of the package to publish.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeGitlabPipelinesToken = async (packageName: string): Promise<string | undefined> => {
    // NPM_ID_TOKEN should be set in GitLab CI/CD variables with the OIDC token
    const idToken = process.env.NPM_ID_TOKEN;

    debug("Verifying OIDC context for publishing from GitLab Pipelines");

    if (!idToken) {
        debug("NPM_ID_TOKEN environment variable is not set");
        debug("Configure trusted publishing in your GitLab project settings and set the NPM_ID_TOKEN variable");

        return undefined;
    }

    return exchangeIdToken(idToken, packageName);
};

/**
 * Exchanges OIDC tokens for supported CI providers.
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

    const ciEnv = envCi();
    const ciProviderName: string | undefined
        = typeof ciEnv === "object" && ciEnv !== null && typeof (ciEnv as KnownCiEnv).name === "string" ? (ciEnv as KnownCiEnv).name : undefined;

    if (!ciProviderName) {
        debug("Unable to detect CI provider for OIDC token exchange");
        debug("Supported CI providers for OIDC trusted publishing: GitHub Actions, GitLab CI/CD");

        return Promise.resolve(undefined);
    }

    debug(`Detected CI provider: ${ciProviderName}`);

    if (GITHUB_ACTIONS_PROVIDER_NAME === ciProviderName) {
        return exchangeGithubActionsToken(pkg.name);
    }

    if (GITLAB_PIPELINES_PROVIDER_NAME === ciProviderName) {
        return exchangeGitlabPipelinesToken(pkg.name);
    }

    debug(`CI provider "${ciProviderName}" is not supported for OIDC trusted publishing`);
    debug("Supported CI providers: GitHub Actions, GitLab CI/CD");

    return Promise.resolve(undefined);
};

export default tokenExchange;

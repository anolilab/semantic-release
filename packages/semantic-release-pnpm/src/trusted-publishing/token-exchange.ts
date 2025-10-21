import envCi from "env-ci";

import { GITHUB_ACTIONS_PROVIDER_NAME, GITLAB_PIPELINES_PROVIDER_NAME, OFFICIAL_REGISTRY } from "../definitions/constants";

/**
 * Exchanges an OIDC ID token for an npm registry token.
 * @param idToken The OIDC ID token to exchange.
 * @param packageName The name of the package to publish.
 * @param logger The logger instance.
 * @param logger.log The logger function.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeIdToken = async (idToken: string, packageName: string, logger: { log: (message: string) => void }): Promise<string | undefined> => {
    const response = await fetch(`${OFFICIAL_REGISTRY}-/npm/v1/oidc/token/exchange/package/${encodeURIComponent(packageName)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        method: "POST",
    });
    const responseBody = await response.json();

    if (response.ok) {
        logger.log("OIDC token exchange with the npm registry succeeded");

        return responseBody.token;
    }

    logger.log(`OIDC token exchange with the npm registry failed: ${response.status} ${responseBody.message}`);

    return undefined;
};

/**
 * Exchanges a GitHub Actions OIDC token for an npm registry token.
 * @param packageName The name of the package to publish.
 * @param logger The logger instance.
 * @param logger.log The logger function.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeGithubActionsToken = async (packageName: string, logger: { log: (message: string) => void }): Promise<string | undefined> => {
    let idToken: string | undefined;

    logger.log("Verifying OIDC context for publishing from GitHub Actions");

    try {
        // Import dynamically to avoid issues if @actions/core is not available
        const { getIDToken } = await import("@actions/core");

        idToken = await getIDToken("npm:registry.npmjs.org");
    } catch (error) {
        logger.log(`Retrieval of GitHub Actions OIDC token failed: ${(error as Error).message}`);
        logger.log("Have you granted the `id-token: write` permission to this workflow?");

        return undefined;
    }

    if (!idToken) {
        return undefined;
    }

    return exchangeIdToken(idToken, packageName, logger);
};

/**
 * Exchanges a GitLab Pipelines OIDC token for an npm registry token.
 * @param packageName The name of the package to publish.
 * @param logger The logger instance.
 * @param logger.log The logger function.
 * @returns A promise that resolves to the npm token or undefined if exchange fails.
 */
const exchangeGitlabPipelinesToken = async (packageName: string, logger: { log: (message: string) => void }): Promise<string | undefined> => {
    const idToken = process.env.NPM_ID_TOKEN;

    logger.log("Verifying OIDC context for publishing from GitLab Pipelines");

    if (!idToken) {
        return undefined;
    }

    return exchangeIdToken(idToken, packageName, logger);
};

/**
 * Exchanges OIDC tokens for supported CI providers.
 * @param pkg The package information.
 * @param pkg.name The name of the package to publish.
 * @param context The semantic-release context.
 * @param context.logger The logger instance.
 * @param context.logger.log The logger function.
 * @returns A promise that resolves to the npm token or undefined if no supported CI provider is detected.
 */
const tokenExchange = (pkg: { name: string }, { logger }: { logger: { log: (message: string) => void } }): Promise<string | undefined> => {
    const { name: ciProviderName } = envCi();

    if (GITHUB_ACTIONS_PROVIDER_NAME === ciProviderName) {
        return exchangeGithubActionsToken(pkg.name, logger);
    }

    if (GITLAB_PIPELINES_PROVIDER_NAME === ciProviderName) {
        return exchangeGitlabPipelinesToken(pkg.name, logger);
    }

    return Promise.resolve(undefined);
};

export default tokenExchange;

import type { PackageJson } from "@visulima/package";
import debug from "debug";
import normalizeUrl from "normalize-url";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import exchangeToken from "./token-exchange";

const debugLog = debug("semantic-release-pnpm:oidc-context");

/**
 * Determines whether an OIDC context has been established for publishing to the official npm registry.
 * This function checks if the target registry is the official npm registry and if a valid OIDC token
 * can be exchanged for the given package.
 * @param registry The npm registry URL to check.
 * @param pkg The package information.
 * @param context The semantic-release context.
 * @param context.logger The logger instance.
 * @param context.logger.log The logger function.
 * @returns A promise that resolves to true if OIDC context is established, false otherwise.
 */
const oidcContext = async (registry: string, pkg: PackageJson, context: { logger: { log: (message: string) => void } }): Promise<boolean> => {
    // Normalize URLs before comparing to handle differences in trailing slashes, casing, etc.
    const normalizedRegistry = normalizeUrl(registry);
    const normalizedOfficialRegistry = normalizeUrl(OFFICIAL_REGISTRY);

    if (normalizedRegistry !== normalizedOfficialRegistry) {
        debugLog(`Registry "${registry}" (normalized: "${normalizedRegistry}") does not match official registry "${OFFICIAL_REGISTRY}" (normalized: "${normalizedOfficialRegistry}"), skipping OIDC check`);

        return false;
    }

    debugLog(`Registry matches official npm registry, attempting OIDC token exchange for package "${pkg.name ?? "unknown"}"`);

    try {
        const token = await exchangeToken({ name: pkg.name ?? "" }, context);

        if (!token) {
            debugLog("OIDC token exchange did not succeed, falling back to NPM_TOKEN authentication");
        }

        return !!token;
    } catch (error) {
        debugLog(`OIDC context check failed: ${error instanceof Error ? error.message : String(error)}`);
        debugLog("Falling back to NPM_TOKEN authentication");

        return false;
    }
};

export default oidcContext;

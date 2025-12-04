import type { PackageJson } from "@visulima/package";
import dbg from "debug";
import normalizeUrl from "normalize-url";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import exchangeToken from "./token-exchange";

const debug = dbg("semantic-release-pnpm:oidc-context");

/**
 * Determines whether an OIDC context has been established for publishing to the official npm registry.
 * This function checks if the target registry is the official npm registry and if a valid OIDC token
 * can be exchanged for the given package.
 * @param registry The npm registry URL to check.
 * @param pkg The package information.
 * @param context The semantic-release context.
 * @returns A promise that resolves to true if OIDC context is established, false otherwise.
 */
const oidcContext = async (registry: string, pkg: PackageJson, context: CommonContext): Promise<boolean> => {
    // Normalize URLs before comparing to handle differences in trailing slashes, casing, etc.
    const normalizedRegistry = normalizeUrl(registry);
    const normalizedOfficialRegistry = normalizeUrl(OFFICIAL_REGISTRY);

    if (normalizedRegistry !== normalizedOfficialRegistry) {
        debug(
            `Registry "${registry}" (normalized: "${normalizedRegistry}") does not match official registry "${OFFICIAL_REGISTRY}" (normalized: "${normalizedOfficialRegistry}"), skipping OIDC check`,
        );

        return false;
    }

    debug(`Registry matches official npm registry, attempting OIDC token exchange for package "${pkg.name ?? "unknown"}"`);

    try {
        const token = await exchangeToken({ name: pkg.name ?? "" }, context);

        if (!token) {
            debug("OIDC token exchange did not succeed, falling back to NPM_TOKEN authentication");
        }

        return !!token;
    } catch (error) {
        debug(`OIDC context check failed: ${error instanceof Error ? error.message : String(error)}`);
        debug("Falling back to NPM_TOKEN authentication");

        return false;
    }
};

export default oidcContext;

import type { PackageJson } from "@visulima/package";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import exchangeToken from "./token-exchange";

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
    if (OFFICIAL_REGISTRY !== registry) {
        return false;
    }

    try {
        const token = await exchangeToken({ name: pkg.name ?? "" }, context);

        return !!token;
    } catch {
        return false;
    }
};

export default oidcContext;

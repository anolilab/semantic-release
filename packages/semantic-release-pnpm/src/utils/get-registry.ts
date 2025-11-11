/* eslint-disable jsdoc/match-description */
/* eslint-disable no-secrets/no-secrets */
import { rc } from "@anolilab/rc";
import type { PackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";
import type { AuthOptions } from "registry-auth-token";

import { DEFAULT_NPM_REGISTRY, OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";

/**
 * Derive the registry URL for a given npm scope from a parsed npm configuration object (`npmrc`).
 * Falls back to {@link OFFICIAL_REGISTRY} when no registry is configured.
 * @param scope – The npm scope (e.g., `@my-org`).
 * @param npmrc – Parsed npm configuration returned by `rc`.
 * @returns A registry URL guaranteed to end with a trailing slash.
 */
const getRegistryUrl = (scope: string, npmrc: AuthOptions["npmrc"]): string => {
    let url: string = OFFICIAL_REGISTRY;

    if (npmrc) {
        const registryUrl = npmrc[`${scope}:registry`] ?? npmrc.registry;

        if (registryUrl) {
            url = registryUrl;
        }
    }

    return url.endsWith("/") ? url : `${url}/`;
};

/**
 * Resolve the registry that should be used for publishing a package.
 *
 * The resolution order is:
 * 1. `package.json#publishConfig.registry`
 * 2. `process.env.NPM_CONFIG_REGISTRY`
 * 3. registry derived from the local (or user supplied) `.npmrc` file
 * 4. {@link DEFAULT_NPM_REGISTRY}
 * @param pkg The package manifest whose registry is to be determined.
 * @param pkg.name The name of the package.
 * @param pkg.publishConfig The publish configuration.
 * @param pkg.publishConfig.registry The registry to use for publishing.
 * @param context Semantic-release execution context.
 * @param context.cwd The base cwd.
 * @param context.env The environment variables.
 * @returns The registry URL (always trailing slash suffixed).
 */
const getRegistry = ({ name, publishConfig: { registry } = {} }: PackageJson, { cwd, env }: CommonContext): string =>
    registry
    ?? env.NPM_CONFIG_REGISTRY
    ?? getRegistryUrl(
        (name as string).split("/")[0] as string,
        rc("npm", {
            config: env.NPM_CONFIG_USERCONFIG ?? resolve(cwd, ".npmrc"),
            cwd,
            defaults: { registry: OFFICIAL_REGISTRY },
        }).config as AuthOptions["npmrc"],
    );

export default getRegistry;

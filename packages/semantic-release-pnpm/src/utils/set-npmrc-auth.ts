import { rc } from "@anolilab/rc";
import { writeFile } from "@visulima/fs";
import { resolve } from "@visulima/path";
import { stringify } from "ini";
import type { AuthOptions } from "registry-auth-token";
import getAuthToken from "registry-auth-token";

import { DEFAULT_NPM_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import getError from "./get-error";
import nerfDart from "./nerf-dart";

/**
 * Ensure that the `.npmrc` file referenced by `npmrc` contains valid authentication credentials for
 * the given registry. Existing config entries are preserved and only modified when credentials are
 * missing.
 *
 * The function supports three authentication strategies (checked in this order):
 * 1. A valid auth token already present in one of the resolved npmrc files.
 * 2. Username / password / email triplet provided via environment variables.
 * 3. A one-time auth token provided via the `NPM_TOKEN` environment variable.
 *
 * If none of the above strategies results in credentials being written, a semantic-release error with
 * code `ENONPMTOKEN` is thrown.
 *
 * @param {string}       npmrc     – Path to the `.npmrc` that should receive credentials when needed.
 * @param {string}       registry  – Registry URL for which credentials are required.
 * @param {CommonContext} context   – Semantic-release context (provides env, cwd and logger).
 *
 * @returns {Promise<void>} Resolves once credentials are verified or have been written.
 */
export default async (
    npmrc: string,
    registry: string,
    { cwd, env: { NPM_CONFIG_USERCONFIG, NPM_EMAIL, NPM_PASSWORD, NPM_TOKEN, NPM_USERNAME }, logger }: CommonContext,
): Promise<void> => {
    logger.log("Verify authentication for registry %s", registry);

    const { config, files } = rc("npm", {
        config: NPM_CONFIG_USERCONFIG ?? resolve(cwd, ".npmrc"),
        cwd,
        defaults: { registry: DEFAULT_NPM_REGISTRY },
    });

    if (Array.isArray(files)) {
        logger.log("Reading npm config from %s", files.join(", "));
    }

    if (getAuthToken(registry, { npmrc: config } as AuthOptions)) {
        await writeFile(npmrc, stringify(config));

        return;
    }

    if (NPM_USERNAME && NPM_PASSWORD && NPM_EMAIL) {
        await writeFile(npmrc, `${Object.keys(config).length > 0 ? `${stringify(config)}\n` : ""}_auth = \${LEGACY_TOKEN}\nemail = \${NPM_EMAIL}`);

        logger.log(`Wrote NPM_USERNAME, NPM_PASSWORD, and NPM_EMAIL to ${npmrc}`);
    } else if (NPM_TOKEN) {
        await writeFile(npmrc, `${Object.keys(config).length > 0 ? `${stringify(config)}\n` : ""}${nerfDart(registry)}:_authToken = \${NPM_TOKEN}`);

        logger.log(`Wrote NPM_TOKEN to ${npmrc}`);
    } else {
        const semanticError = getError("ENONPMTOKEN", { registry });

        throw new AggregateError([semanticError], semanticError.message);
    }
};

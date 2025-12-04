/* eslint-disable no-secrets/no-secrets */
/* eslint-disable no-irregular-whitespace */
import { rc } from "@anolilab/rc";
import { writeFile } from "@visulima/fs";
import { resolve } from "@visulima/path";
import dbg from "debug";
import { stringify } from "ini";
import type { AuthOptions } from "registry-auth-token";
import getAuthToken from "registry-auth-token";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import getError from "./get-error";
import nerfDart from "./nerf-dart";

const debug = dbg("semantic-release-pnpm:auth");

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
 * @param npmrc – Path to the `.npmrc` that should receive credentials when needed.
 * @param registry – Registry URL for which credentials are required.
 * @param context – Semantic-release context (provides env, cwd and logger).
 * @param context.cwd The base cwd.
 * @param context.env The environment variables.
 * @param context.env.NPM_CONFIG_USERCONFIG The path to the `.npmrc` file.
 * @param context.env.NPM_EMAIL The email address.
 * @param context.env.NPM_PASSWORD The password.
 * @param context.env.NPM_TOKEN The token.
 * @param context.env.NPM_USERNAME The username.
 * @param context.logger The logger instance.
 * @returns Resolves once credentials are verified or have been written.
 */
const setNpmrcAuth = async (
    npmrc: string,
    registry: string,
    { cwd, env: { NPM_CONFIG_USERCONFIG, NPM_EMAIL, NPM_PASSWORD, NPM_TOKEN, NPM_USERNAME }, logger }: CommonContext,
): Promise<void> => {
    logger.log("Verify authentication for registry %s", registry);

    const { config, files } = rc("npm", {
        config: NPM_CONFIG_USERCONFIG ?? resolve(cwd, ".npmrc"),
        cwd,
        defaults: { registry: OFFICIAL_REGISTRY },
    });

    if (Array.isArray(files)) {
        logger.log("Reading npm config from %s", files.join(", "));
    }

    const existingToken = getAuthToken(registry, { npmrc: config } as AuthOptions);

    if (existingToken) {
        debug(`Using existing authentication token from npmrc files for registry "${registry}"`);
        await writeFile(npmrc, stringify(config));

        return;
    }

    if (NPM_USERNAME && NPM_PASSWORD && NPM_EMAIL) {
        debug(`Using username/password/email authentication strategy for registry "${registry}"`);
        // Use scoped auth format: //registry/:_auth instead of _auth (required by npm/pnpm)
        await writeFile(
            npmrc,
            `${Object.keys(config).length > 0 ? `${stringify(config)}\n` : ""}${nerfDart(registry)}:_auth = \${LEGACY_TOKEN}\nemail = \${NPM_EMAIL}`,
        );

        logger.log(`Wrote NPM_USERNAME, NPM_PASSWORD, and NPM_EMAIL to ${npmrc}`);
    } else if (NPM_TOKEN) {
        debug(`Using NPM_TOKEN authentication strategy for registry "${registry}"`);
        await writeFile(npmrc, `${Object.keys(config).length > 0 ? `${stringify(config)}\n` : ""}${nerfDart(registry)}:_authToken = \${NPM_TOKEN}`);

        logger.log(`Wrote NPM_TOKEN to ${npmrc}`);
    } else {
        debug(`No authentication credentials found for registry "${registry}"`);
        const semanticError = getError("ENONPMTOKEN", { registry });

        throw new AggregateError([semanticError], semanticError.message);
    }
};

export default setNpmrcAuth;

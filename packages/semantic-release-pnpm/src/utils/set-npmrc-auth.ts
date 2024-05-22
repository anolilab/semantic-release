import { writeFile } from "@visulima/fs";
import { resolve } from "@visulima/path";
import AggregateError from "aggregate-error";
import { stringify } from "ini";
import type { AuthOptions } from "registry-auth-token";
import getAuthToken from "registry-auth-token";

import { DEFAULT_NPM_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import getError from "./get-error";
import nerfDart from "./nerf-dart";
import rc from "./rc";

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

    if (files) {
        logger.log("Reading npm config from %s", files.join(", "));
    }

    if (getAuthToken(registry, { npmrc: config } as AuthOptions)) {
        await writeFile(npmrc, stringify(config));

        return;
    }

    if (NPM_USERNAME && NPM_PASSWORD && NPM_EMAIL) {
        await writeFile(npmrc, `${config ? `${stringify(config)}\n` : ""}_auth = \${LEGACY_TOKEN}\nemail = \${NPM_EMAIL}`);

        logger.log(`Wrote NPM_USERNAME, NPM_PASSWORD, and NPM_EMAIL to ${npmrc}`);
    } else if (NPM_TOKEN) {
        await writeFile(npmrc, `${config ? `${stringify(config)}\n` : ""}${nerfDart(registry)}:_authToken = \${NPM_TOKEN}`);

        logger.log(`Wrote NPM_TOKEN to ${npmrc}`);
    } else {
        throw new AggregateError([getError("ENONPMTOKEN", { registry })]);
    }
};

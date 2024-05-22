import type { PackageJson } from "@visulima/package";
import { resolve } from "@visulima/path";
import type { AuthOptions } from "registry-auth-token";

import { DEFAULT_NPM_REGISTRY } from "../definitions/constants";
import type { CommonContext } from "../definitions/context";
import rc from "./rc";

const getRegistryUrl = (scope: string, npmrc: AuthOptions["npmrc"]): string => {
    let url: string = DEFAULT_NPM_REGISTRY;

    if (npmrc) {
        const registryUrl = npmrc[`${scope}:registry`] ?? npmrc["registry"];

        if (registryUrl) {
            url = registryUrl;
        }
    }

    return url.slice(-1) === "/" ? url : `${url}/`;
};

export default ({ name, publishConfig: { registry } = {} }: PackageJson, { cwd, env }: CommonContext): string =>
    registry ??
    env.NPM_CONFIG_REGISTRY ??
    getRegistryUrl(
        (name as string).split("/")[0] as string,
        rc("npm", {
            config: env.NPM_CONFIG_USERCONFIG ?? resolve(cwd, ".npmrc"),
            cwd,
            defaults: { registry: "https://registry.npmjs.org/" },
        }).config as AuthOptions["npmrc"],
    );

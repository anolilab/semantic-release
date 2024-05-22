import { ensureFileSync, isAccessibleSync } from "@visulima/fs";
import { findCacheDirectorySync } from "@visulima/package";
import { resolve } from "@visulima/path";

import getError from "./get-error";

const getNpmrcPath = (cwd: string, environment: NodeJS.ProcessEnv): string => {
    let npmrc: string | undefined;

    const npmrcPath = resolve(cwd, ".npmrc");

    if (environment.NPM_CONFIG_USERCONFIG && isAccessibleSync(environment.NPM_CONFIG_USERCONFIG)) {
        npmrc = environment.NPM_CONFIG_USERCONFIG;
    } else if (isAccessibleSync(npmrcPath)) {
        npmrc = npmrcPath;
    } else {
        const temporaryNpmrcPath = findCacheDirectorySync("semantic-release-pnpm", { create: true, cwd });

        if (temporaryNpmrcPath) {
            ensureFileSync(temporaryNpmrcPath);

            npmrc = temporaryNpmrcPath;
        }
    }

    if (npmrc === undefined) {
        // eslint-disable-next-line unicorn/error-message
        throw new AggregateError([
            getError("ENOPNPMRC", {
                npmrc: npmrcPath,
            }),
        ]);
    }

    return npmrc;
};

export default getNpmrcPath;

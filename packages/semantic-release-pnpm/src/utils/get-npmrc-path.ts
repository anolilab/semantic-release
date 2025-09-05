import { ensureFileSync, isAccessibleSync } from "@visulima/fs";
import { resolve } from "@visulima/path";

/**
 * Determine the path to the `.npmrc` file that should be used for authentication and configuration
 * during the publish process.
 *
 * The resolution logic is:
 * 1. When the environment variable `NPM_CONFIG_USERCONFIG` is set **and** points to an existing
 * file, that path wins (it allows CI systems to inject custom npmrc files).
 * 2. When a `.npmrc` exists in the provided `cwd`, return that path.
 * 3. Otherwise create an empty `.npmrc` file inside `cwd` (so later steps can write credentials) and
 * return the newly created path.
 * @param cwd – Working directory from which to derive the default path.
 * @param environment – Environment variables (typically `context.env`).
 * @returns Absolute path to the `.npmrc` file that should be used/written.
 */
const getNpmrcPath = (cwd: string, environment: NodeJS.ProcessEnv): string => {
    const npmrcPath = resolve(cwd, ".npmrc");

    if (environment.NPM_CONFIG_USERCONFIG && isAccessibleSync(environment.NPM_CONFIG_USERCONFIG)) {
        return environment.NPM_CONFIG_USERCONFIG;
    }

    if (isAccessibleSync(npmrcPath)) {
        return npmrcPath;
    }

    ensureFileSync(npmrcPath);

    return npmrcPath;
};

export default getNpmrcPath;

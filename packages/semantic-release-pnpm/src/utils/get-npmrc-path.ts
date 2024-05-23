import { ensureFileSync, isAccessibleSync } from "@visulima/fs";
import { resolve } from "@visulima/path";

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

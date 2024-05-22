import AggregateError from "aggregate-error";

import type { VerifyConditionsContext } from "../definitions/context";
import type { PluginConfig } from "../definitions/plugin-config";
import getNpmrcPath from "../utils/get-npmrc-path";
import getPackage from "../utils/get-pkg";
import { shouldPublish } from "../utils/should-publish";
import verifyAuth from "./verify-auth";
import verifyConfig from "./verify-config";
import verifyPnpm from "./verify-pnpm";

const verify = async (pluginConfig: PluginConfig, context: VerifyConditionsContext): Promise<void> => {
    let errors: Error[] = verifyConfig(pluginConfig);

    try {
        await verifyPnpm(context);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        const typedError = error as AggregateError;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        errors = [...errors, ...(typedError.errors ?? [error])];
    }

    try {
        const packageJson = await getPackage(pluginConfig, context);

        if (shouldPublish(pluginConfig, packageJson)) {
            const npmrc = getNpmrcPath(context.cwd, context.env);

            await verifyAuth(npmrc, packageJson, context);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        const typedError = error as AggregateError;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        errors = [...errors, ...(typedError.errors ?? [error])];
    }

    if (errors.length > 0) {
        throw new AggregateError(errors);
    }
};

export default verify;

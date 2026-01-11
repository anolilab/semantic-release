import type { VerifyConditionsContext } from "../definitions/context";
import type { PluginConfig } from "../definitions/plugin-config";
import getNpmrcPath from "../utils/get-npmrc-path";
import getPackage from "../utils/get-package";
import { shouldPublish } from "../utils/should-publish";
import verifyAuth from "./verify-auth";
import verifyConfig from "./verify-config";
import verifyPnpm from "./verify-pnpm";

/**
 * Aggregate all verification steps required by the plugin during the `verifyConditions` life-cycle
 * and throw a single `AggregateError` containing all individual errors.
 *
 * The verification flow consists of three independent parts:
 * 1. Validate the user-supplied plugin configuration (`verify-config`).
 * 2. Check that the required `pnpm` version is available on the system (`verify-pnpm`).
 * 3. If the package is going to be published, verify registry authentication (`verify-auth`).
 *
 * Any errors coming from the individual verifiers are collected and only thrown at the very end so
 * that users can fix multiple issues in a single iteration.
 * @param pluginConfig – Resolved configuration object for the plugin.
 * @param context – semantic-release context for the verify phase.
 * @returns Resolves when all verifiers succeed, otherwise rejects with an
 * `AggregateError`.
 */
const verify = async (pluginConfig: PluginConfig, context: VerifyConditionsContext): Promise<void> => {
    let errors: Error[] = verifyConfig(pluginConfig);
    let errorsMessage = "";

    try {
        await verifyPnpm(context);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        const typedError = error as AggregateError;

        errorsMessage += typedError.message;

        errors = [...errors, ...(typedError.errors ?? [error])];
    }

    try {
        const packageJson = await getPackage(pluginConfig, context);

        if (shouldPublish(pluginConfig, packageJson)) {
            context.logger.log(`Verifying authentication for package "${packageJson.name ?? "unknown"}"`);

            const npmrc = getNpmrcPath(context.cwd, context.env);

            await verifyAuth(npmrc, packageJson, context, pluginConfig.pkgRoot);
        } else {
            context.logger.log(`Skipping authentication verification for package "${packageJson.name ?? "unknown"}" (publishing disabled)`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        const typedError = error as AggregateError;

        errorsMessage += typedError.message;

        errors = [...errors, ...(typedError.errors ?? [error])];
    }

    if (errors.length > 0) {
        throw new AggregateError(errors, errorsMessage);
    }
};

export default verify;

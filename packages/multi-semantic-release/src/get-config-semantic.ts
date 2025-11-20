import semanticGetConfig from "semantic-release/lib/get-config.js";
import signale from "signale";
import { WritableStreamBuffer } from "stream-buffers";

import logger from "./logger";

type Logger = {
    failure: (...args: unknown[]) => void;
};

const { Signale } = signale;

/**
 * Get the release configuration options for a given directory.
 * @param context Object containing cwd, env, and logger properties that are passed to getConfig()
 * @param context.cwd
 * @param context.env
 * @param options Options object for the config.
 * @param context.stderr
 * @param context.stdout
 * @returns Returns what semantic-release's get config returns (object with options and plugins objects).
 * @internal
 */
interface GetConfigSemanticContext {
    cwd: string;
    env: Record<string, string>;
    stderr: NodeJS.WriteStream;
    stdout: NodeJS.WriteStream;
}

const getConfigSemantic = async (
    { cwd, env, stderr, stdout }: GetConfigSemanticContext,
    options: Record<string, unknown>,
): Promise<{ options: Record<string, unknown>; plugins: Record<string, unknown> }> => {
    try {
        const blackholeBuffer = new WritableStreamBuffer();
        // eslint-disable-next-line sonarjs/confidential-information-logging
        const blackhole = new Signale({ stream: blackholeBuffer as unknown as NodeJS.WriteStream });

        return await semanticGetConfig({ cwd, env, logger: blackhole as unknown as Record<string, unknown>, stderr, stdout }, options);
    } catch (error: unknown) {
        (logger as Logger).failure(`Error in semantic-release getConfig(): %0`, error);

        throw error;
    }
};

export default getConfigSemantic;

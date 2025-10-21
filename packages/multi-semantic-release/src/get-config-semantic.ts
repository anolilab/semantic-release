import semanticGetConfig from "semantic-release/lib/get-config.js";
import signale from "signale";
import { WritableStreamBuffer } from "stream-buffers";

import logger from "./logger.js";
import type { WritableStreamBuffer } from "./types.js";

const { Signale } = signale;

/**
 * Get the release configuration options for a given directory.
 * Unfortunately we've had to copy this over from semantic-release, creating unnecessary duplication.
 * @param {object} context Object containing cwd, env, and logger properties that are passed to getConfig()
 * @param context.cwd
 * @param context.env
 * @param {object} options Options object for the config.
 * @param context.stderr
 * @param context.stdout
 * @returns {object} Returns what semantic-release's get config returns (object with options and plugins objects).
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
        // Blackhole logger (so we don't clutter output with "loaded plugin" messages).
        const blackhole = new Signale({ stream: new WritableStreamBuffer() });

        // Return semantic-release's getConfig script.
        return await semanticGetConfig({ cwd, env, logger: blackhole, stderr, stdout }, options);
    } catch (error: unknown) {
        // Log error and rethrow it.
        // istanbul ignore next (not important)
        logger.failure(`Error in semantic-release getConfig(): %0`, error);
        // istanbul ignore next (not important)
        throw error;
    }
};

// Exports.
export default getConfigSemantic;

declare module "semantic-release/lib/git.js" {
    export function getTagHead(tag: string, options: { cwd: string; env: Record<string, string> }): Promise<string>;
}

declare module "semantic-release/lib/get-config.js" {
    import type { Options } from "semantic-release";

    export default function getConfig(
        context: {
            cwd: string;
            env: Record<string, string>;
            logger: Record<string, unknown>;
            stderr: NodeJS.WriteStream;
            stdout: NodeJS.WriteStream;
        },
        options: Options,
    ): Promise<{ options: Record<string, unknown>; plugins: Record<string, unknown> }>;
}

import { exit } from "node:process";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../logger";
import multiSemanticRelease from "../multi-semantic-release";

const stringList = {
    array: true,
    coerce: (values: string[]): string[] => {
        if (values.length === 1 && values[0]?.trim() === "false") {
            return [];
        }

        const result: string[] = [];

        for (const value of values) {
            result.push(...value.split(",").map((x: string) => x.trim()));
        }

        return result;
    },
    type: "array" as const,
};

await (async (): Promise<void> => {
    const cli = yargs(hideBin(process.argv))
        .usage("$0 [args]")
        .scriptName("multi-semantic-release")
        .option("d", { alias: "dry-run", default: false, describe: "Skip publishing", group: "Options", type: "boolean" })
        .option("h", { alias: "help", group: "Options" })
        .option("debug", {
            describe: "Output debugging information.",
            type: "boolean",
        })
        .option("silent", {
            describe: "Do not print configuration information.",
            type: "boolean",
        })
        .option("sequential-init", {
            describe: "Avoid hypothetical concurrent initialization collisions.",
            type: "boolean",
        })
        .option("sequential-prepare", {
            describe: "Avoid hypothetical concurrent preparation collisions. Do not use if your project have cyclic dependencies.",
            type: "boolean",
        })
        .option("first-parent", {
            describe: "Apply commit filtering to current branch only.",
            type: "boolean",
        })
        .option("deps.bump", {
            describe: "Define deps version updating rule. Allowed: override, satisfy, inherit.",
            type: "string",
        })
        .option("deps.release", {
            describe: "Define release type for dependent package if any of its deps changes. Supported values: patch, minor, major, inherit.",
            type: "string",
        })
        .option("deps.prefix", {
            describe:
                "Optional prefix to be attached to the next dep version if '--deps.bump' set to 'override'. Supported values: '^' | '~' | '' (empty string as default).",
            type: "string",
        })
        .option("b", { alias: "branches", describe: "Git branches to release from", ...stringList, group: "Options" })
        .option("ci", { describe: "Toggle CI verifications", group: "Options", type: "boolean" })
        .option("ignore-packages", {
            ...stringList,
            describe: "Packages list to be ignored on bumping process",
        })
        .option("ignore-private", {
            describe: "Exclude private packages. Enabled by default, pass 'no-ignore-private' to disable.",
            type: "boolean",
        })
        .option("tag-format", {
            describe:
                // eslint-disable-next-line no-template-curly-in-string
                "Format to use for creating tag names. Should include \"name\" and \"version\" vars. Default: \"${name}@${version}\" generates \"package-name@1.0.0\"",
            type: "string",
        })
        .strict(false)
        .exitProcess(false);

    try {
        const parsed = cli.parse(process.argv.slice(2)) as Record<string, unknown> & { help?: boolean; version?: boolean };
        const { help, version, ...options } = parsed;

        if (Boolean(help) || Boolean(version)) {
            exit(0);
        }

        // eslint-disable-next-line promise/catch-or-return
        multiSemanticRelease(null, {}, {}, options as Parameters<typeof multiSemanticRelease>[3]).then(
            // eslint-disable-next-line promise/always-return
            () => {
                exit(0);
            },
            (error: Error) => {
                logger.error(`[multi-semantic-release]:`, error);
                exit(1);
            },
        );
    } catch (error: unknown) {
        logger.error(`[multi-semantic-release]:`, error);
        exit(1);
    }
})();

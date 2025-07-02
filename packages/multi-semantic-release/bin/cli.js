#!/usr/bin/env node

import { exit } from "node:process";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../lib/logger.js";

const stringList = {
    array: true,
    coerce: function coerce(values) {
        // eslint-disable-next-line unicorn/no-array-reduce,unicorn/prefer-spread
        return values.length === 1 && values[0].trim() === "false" ? [] : values.reduce((v, value) => v.concat(value.split(",").map((x) => x.trim())), []);
    },
    type: "string",
};

// eslint-disable-next-line  consistent-return
await (async () => {
    const cli = yargs(hideBin(process.argv))
        .usage("$0 [args]")
        .scriptName("multi-semantic-release")
        .option("d", { alias: "dry-run", describe: "Skip publishing", group: "Options", type: "boolean" })
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
        .option("deps.excludeDependencies", {
            describe: "List of package names to exclude from dependency bumping (useful for circular dependencies).",
            ...stringList,
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
        const { _, help, version, ...options } = cli.parse(process.argv.slice(2));

        if (Boolean(help) || Boolean(version)) {
            return 0;
        }

        // Imports.
        // eslint-disable-next-line unicorn/no-await-expression-member
        const multiSemanticRelease = (await import("../lib/multi-semantic-release.js")).default;

        // Do multirelease (log out any errors).
        // eslint-disable-next-line promise/catch-or-return
        multiSemanticRelease(null, {}, {}, options).then(
            // eslint-disable-next-line promise/always-return
            () => {
                // Success.
                exit(0);
            },
            (error) => {
                // Log out errors.
                logger.error(`[multi-semantic-release]:`, error);
                exit(1);
            },
        );
    } catch (error) {
        // Log out errors.
        logger.error(`[multi-semantic-release]:`, error);
        exit(1);
    }
})();

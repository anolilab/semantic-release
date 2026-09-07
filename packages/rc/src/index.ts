/* eslint-disable jsdoc/match-description */
/* eslint-disable jsdoc/check-values */
/* eslint-disable no-secrets/no-secrets */
import { homedir } from "node:os";
import { cwd, env } from "node:process";

// eslint-disable-next-line import/no-extraneous-dependencies
import { isAccessibleSync, readFileSync } from "@visulima/fs";
// eslint-disable-next-line import/no-extraneous-dependencies
import { parseJson, stripJsonComments } from "@visulima/fs/utils";
// eslint-disable-next-line import/no-extraneous-dependencies
import { dirname, join } from "@visulima/path";
import { parse } from "ini";
import { merge } from "ts-deepmerge";

import isJson from "./utils/is-json";

/**
 * A single value in a configuration tree — whatever JSON, an ini file or an
 * environment variable can express.
 */
type ConfigValue = boolean | null | number | ReadonlyArray<ConfigValue> | string | undefined | { [key: string]: ConfigValue };

/** A configuration object keyed by name, nested to any depth. */
type ConfigObject = { [key: string]: ConfigValue };

/**
 * Narrows a parsed value to an object we can merge. Written as a predicate rather
 * than an assertion so the check that runs is the check the type rests on.
 * @param value
 * @returns
 */
const isConfigObject = (value: unknown): value is ConfigObject => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Modified copy of the env function from https://github.com/dominictarr/rc/blob/a97f6adcc37ee1cad06ab7dc9b0bd842bbc5c664/lib/utils.js#L42.
 * @license https://github.com/dominictarr/rc/blob/master/LICENSE.APACHE2
 * @license https://github.com/dominictarr/rc/blob/master/LICENSE.BSD
 * @license https://github.com/dominictarr/rc/blob/master/LICENSE.MIT
 * @param prefix
 * @param environment
 * @returns
 */
const getEnvironment = (prefix: string, environment: Record<string, string | undefined> = env): ConfigObject => {
    const returnValue: ConfigObject = {};
    const l = prefix.length;

    // eslint-disable-next-line no-restricted-syntax
    for (const k in environment) {
        if (!k.toLowerCase().startsWith(prefix.toLowerCase())) {
            continue;
        }

        const keypath = k.slice(Math.max(0, l)).split("__");

        // Trim empty strings from keypath array
        let emptyStringIndex;

        // eslint-disable-next-line no-cond-assign
        while ((emptyStringIndex = keypath.indexOf("")) > -1) {
            keypath.splice(emptyStringIndex, 1);
        }

        // Goes undefined once the walk reaches a key already holding a primitive:
        // there is nothing left to descend into, so the rest of the keypath is dropped.
        let cursor: ConfigObject | undefined = returnValue;

        keypath.forEach((subkey, index) => {
            // (check for subkey first so we ignore empty strings)
            if (!subkey || cursor === undefined) {
                return;
            }

            // If this is the last key, just stuff the value in there
            // Assigns actual value from env variable to final key
            // (unless it's just an empty string- in that case use the last valid key)
            if (index === keypath.length - 1) {
                cursor[subkey] = environment[k];
            }

            // Build sub-object if nothing already exists at the keypath
            if (cursor[subkey] === undefined) {
                cursor[subkey] = {};
            }

            // Increment cursor used to track the object at the current depth
            const next = cursor[subkey];

            cursor = isConfigObject(next) ? next : undefined;
        });
    }

    return returnValue;
};

/**
 * Will look in all the obvious places for configuration:
 *
 * - The defaults object you passed in
 * - `/etc/${appname}/config`
 * - `/etc/${appname}rc`
 * - `$HOME/.config/${appname}/config`
 * - `$HOME/.config/${appname}`
 * - `$HOME/.${appname}/config`
 * - `$HOME/.${appname}rc`
 * - a local `.${appname}/config` and `.${appname}rc` and all found looking in `../../../ ../../ ../ ./` etc.
 * - if you passed environment variable `${appname}_config` then from that file
 * - if you passed options.config variable, then from that file
 * - environment variables prefixed with `${appname}_`
 * or use "\_\_" to indicate nested properties &lt;br/> _(e.g. `appname_foo__bar__baz` => `foo.bar.baz`)_
 * @param name
 * @param home
 * @param internalCwd
 * @param stopAt
 * @param environmentConfig
 * @param optionConfig
 * @returns
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const getConfigFiles = (name: string, home: string, internalCwd: string, stopAt?: string, environmentConfig?: string, optionConfig?: string): string[] => {
    const configFiles = new Set<string>();

    for (const file of [`/etc/${name}/config`, `/etc/${name}rc`]) {
        if (isAccessibleSync(file)) {
            configFiles.add(file);
        }
    }

    for (const file of [join(home, ".config", name, "config"), join(home, ".config", name), join(home, `.${name}`, "config"), join(home, `.${name}rc`)]) {
        if (isAccessibleSync(file)) {
            configFiles.add(file);
        }

        if (isAccessibleSync(`${file}.json`)) {
            configFiles.add(`${file}.json`);
        }
    }

    let start = internalCwd;
    let isEndOfLoop = false;

    const files = [join(`.${name}`, "config.json"), join(`.${name}`, "config"), join(`.${name}rc.json`), join(`.${name}rc`)];

    const traversedFiles: string[] = [];

    do {
        for (const file of files) {
            const traverseFile = join(start, file);

            if (isAccessibleSync(traverseFile)) {
                traversedFiles.push(traverseFile);
            }
        }

        start = dirname(start);

        if (isEndOfLoop) {
            break;
        }

        isEndOfLoop = dirname(start) === start;
    } while (stopAt ? start === stopAt : true); // root

    // reverse the traversedFiles so its starts with root
    for (const file of traversedFiles.toReversed()) {
        configFiles.add(file);
    }

    if (typeof environmentConfig === "string" && isAccessibleSync(environmentConfig)) {
        configFiles.add(environmentConfig);
    }

    if (optionConfig && isAccessibleSync(optionConfig)) {
        configFiles.add(optionConfig);
    }

    return [...configFiles];
};

/**
 * Aggregates configuration from multiple sources (defaults, configuration files, and environment variables)
 * into a single object, following the same resolution logic as the original `rc` npm package.
 *
 * The resolution order is (highest precedence last):
 * 1. `options.defaults` – default values supplied by the caller
 * 2. Configuration files discovered by {@link getConfigFiles}
 * 3. Environment variables that start with `${name}_` (nested via `__`)
 *
 * The function also returns the list of configuration file paths that were read while resolving the
 * configuration. No mutation is performed on any of the discovered files – they are only read.
 * @param name The base name of the application (used to derive env-var prefix and file names).
 * @param [options] Optional behaviour switches.
 * @param [options.config] Explicit path to a configuration file that should be merged last.
 * @param [options.cwd] Working directory to start searching for local configuration files.
 * @param [options.defaults] Default configuration values that act as the lowest precedence.
 * @param [options.home] Home directory to look for user-level configuration files. Defaults to the current user home directory.
 * @param [options.stopAt] Absolute path that acts as a boundary when traversing up the directory tree.
 * @returns
 * An object containing the final merged `config` and the ordered list of `files` that were considered.
 */
export const rc = (
    name: string,
    options: {
        config?: string;
        cwd?: string;
        defaults?: ConfigObject;
        home?: string;
        stopAt?: string;
    } = {},
): { config: ConfigObject; files: string[] } => {
    const home = options.home ?? homedir();
    const internalCwd = options.cwd ?? cwd();

    // eslint-disable-next-line @typescript-eslint/naming-convention, sonarjs/no-unused-vars
    const { config: _, ...environment } = getEnvironment(`${name}_`);

    const configFiles = getConfigFiles(name, home, internalCwd, options.stopAt, env[`${name}_config`], options.config);

    const configs: ConfigObject[] = [];

    for (const file of configFiles) {
        const content = readFileSync(file, { buffer: false });

        if (isJson(content)) {
            const parsed = parseJson(stripJsonComments(content));

            // A config file has to be an object at the top level; a bare string,
            // number or array in one is a mistake worth naming rather than merging.
            if (!isConfigObject(parsed)) {
                throw new TypeError(`Expected ${file} to hold a JSON object, found ${parsed === null ? "null" : typeof parsed}.`);
            }

            configs.push(parsed);
        } else {
            configs.push(parse(content));
        }
    }

    configs.push(environment);

    return { config: merge(options.defaults ?? {}, ...configs), files: configFiles };
};

export type { ConfigObject, ConfigValue };

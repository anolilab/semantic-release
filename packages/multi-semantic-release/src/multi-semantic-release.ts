import { dirname } from "node:path";

import { topo } from "@semrel-extra/topo";
// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array
import { castArray, sortBy, template } from "lodash-es";
import semanticRelease from "semantic-release";
import semrelPkgJson from "semantic-release/package.json" with { type: "json" };

import multisemrelPackageJson from "../package.json";
import createInlinePluginCreator from "./create-inline-plugin-creator";
import getConfig from "./get-config";
import getConfigMultiSemrel from "./get-config-multi-semrel";
import getConfigSemantic from "./get-config-semantic";
import getManifest from "./get-manifest";
import logger from "./logger";
import RescopedStream from "./rescoped-stream";
import type { Flags, GlobalOptions, InputOptions, MultiContext, Package } from "./types";
import { check } from "./utils/blork";
import cleanPath from "./utils/clean-path";

/**
 * Load details about a package.
 * @param path The path to load details about.
 * @param allOptions Options that apply to all packages.
 * @param multiContext Context object for the multirelease.
 * @param allOptions.cwd
 * @param allOptions.env
 * @param allOptions.globalOptions
 * @param allOptions.inputOptions
 * @param allOptions.stderr
 * @param allOptions.stdout
 * @returns A package object, or void if the package was skipped.
 * @internal
 */
const getPackage = async (
    path: string,
    {
        cwd,
        env,
        globalOptions,
        inputOptions,
        stderr,
        stdout,
    }: {
        cwd: string;
        env: NodeJS.ProcessEnv;
        globalOptions: GlobalOptions;
        inputOptions: InputOptions;
        stderr: NodeJS.WriteStream;
        stdout: NodeJS.WriteStream;
    },
): Promise<Package | void> => {
    // Make path absolute.
    // eslint-disable-next-line no-param-reassign
    path = cleanPath(path, cwd);

    const directory = dirname(path);

    // Get package.json file contents.
    const manifest = getManifest(path);
    const { name } = manifest;

    // Combine list of all dependency names.
    const deps: string[] = Object.keys({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
    });

    // Load the package-specific options.
    const packageOptions = await getConfig(directory);

    // The 'final options' are the global options merged with package-specific options.
    // We merge this ourselves because package-specific options can override global options.
    const finalOptions: Record<string, unknown> = { ...globalOptions, ...packageOptions, ...inputOptions };

    // Make a fake logger so semantic-release's get-config doesn't fail.
    const fakeLogger = { error() {}, log() {} };

    // Use semantic-release's internal config with the final options (now we have the right `options.plugins` setting) to get the plugins object and the options including defaults.
    // We need this so we can call e.g. plugins.analyzeCommit() to be able to affect the input and output of the whole set of plugins.
    const { options, plugins } = await getConfigSemantic({ cwd: directory, env, stderr, stdout }, finalOptions);

    // Return package object.
    return { deps, dir: directory, fakeLogger, manifest, name, options, path, plugins } as Package;
};

/**
 * Release an individual package.
 * @param pkg The specific package.
 * @param package_
 * @param createInlinePlugin A function that creates an inline plugin.
 * @param multiContext Context object for the multirelease.
 * @param flags Argv flags.
 * @returns Promise that resolves when done.
 * @internal
 */
const releasePackage = async (
    package_: Package,
    createInlinePlugin: (package_: Package) => Record<string, unknown>,
    multiContext: MultiContext,
    flags: Flags,
): Promise<Package> => {
    // Vars.
    const { dir, name, options: packageOptions } = package_;
    const { env, stderr, stdout } = multiContext;

    // Make an 'inline plugin' for this package.
    // The inline plugin is the only plugin we call semanticRelease() with.
    // The inline plugin functions then call e.g. plugins.analyzeCommits() manually and sometimes manipulate the responses.
    const inlinePlugin = createInlinePlugin(package_);

    // Set the options that we call semanticRelease() with.
    // This consists of:
    // - The global options (e.g. from the top level package.json)
    // - The package options (e.g. from the specific package's package.json)
    const options: Record<string, unknown> = { ...packageOptions, ...inlinePlugin };

    // Add the package name into tagFormat.
    // Thought about doing a single release for the tag (merging several packages), but it's impossible to prevent Github releasing while allowing NPM to continue.
    // It'd also be difficult to merge all the assets into one release without full editing/overriding the plugins.
    const tagFormatContext = {
        name,
        // eslint-disable-next-line no-template-curly-in-string
        version: "${version}",
    };

    // eslint-disable-next-line no-template-curly-in-string
    const tagFormatDefault = "${name}@${version}";

    options.tagFormat = template(flags.tagFormat || tagFormatDefault)(tagFormatContext);

    // These are the only two options that MSR shares with semrel
    // Set them manually for now, defaulting to the msr versions
    // This is approach can be reviewed if there's ever more crossover.
    // - debug is only supported in semrel as a CLI arg, always default to MSR
    options.debug = flags.debug;
    // - dryRun should use the msr version if specified, otherwise fallback to semrel
    options.dryRun = flags.dryRun === undefined ? options.dryRun : flags.dryRun;
    options.ci = flags.ci === undefined ? options.ci : flags.ci;
    options.branches = flags.branches ? castArray(flags.branches) : options.branches;

    // This options are needed for plugins that do not rely on `pluginOptions` and extract them independently.
    options._pkgOptions = packageOptions;

    // Call semanticRelease() on the directory and save result to pkg.
    // Don't need to log out errors as semantic-release already does that.
    // eslint-disable-next-line no-param-reassign
    package_.result = await semanticRelease(options, {
        cwd: dir,
        env,
        stderr: new RescopedStream(stderr, name),
        stdout: new RescopedStream(stdout, name),
    });

    return package_;
};

/**
 * The multi-release context.
 * @typedef MultiContext
 * @param {Package[]} packages Array of all packages in this multirelease.
 * @param {Package[]} releasing Array of packages that will release.
 * @param {string} cwd The current working directory.
 * @param {object} env The environment variables.
 * @param {Logger} logger The logger for the multirelease.
 * @param {Stream} stdout The output stream for this multirelease.
 * @param {Stream} stderr The error stream for this multirelease.
 */

/**
 * Details about an individual package in a multirelease
 * @typedef Package
 * @param {string} path String path to `package.json` for the package.
 * @param {string} dir The working directory for the package.
 * @param {string} name The name of the package, e.g. `my-amazing-package`
 * @param {string[]} deps Array of all dependency package names for the package (merging dependencies, devDependencies, peerDependencies).
 * @param {Package[]} localDeps Array of local dependencies this package relies on.
 * @param {context|void} context The semantic-release context for this package's release (filled in once semantic-release runs).
 * @param {undefined|Result|false} result The result of semantic-release (object with lastRelease, nextRelease, commits, releases), false if this package was skipped (no changes or similar), or undefined if the package's release hasn't completed yet.
 * @param {object} _lastRelease The last release object for the package before its current release (set during anaylze-commit)
 * @param {object} _nextRelease The next release object (the release the package is releasing for this cycle) (set during generateNotes)
 */

/**
 * Perform a multirelease.
 * @param {string[]} paths An array of paths to package.json files.
 * @param {object} inputOptions An object containing semantic-release options.
 * @param {object} settings An object containing: cwd, env, stdout, stderr (mainly for configuring tests).
 * @param settings.cwd
 * @param settings.env
 * @param {object} _flags Argv flags.
 * @param settings.stderr
 * @param settings.stdout
 * @returns {Promise<Package[]>} Promise that resolves to a list of package objects with `result` property describing whether it released or not.
 */

/**
 * @param paths
 * @param inputOptions
 * @param root0
 * @param root0.cwd
 * @param root0.env
 * @param root0.stderr
 * @param root0.stdout
 * @param _flags
 */
const multiSemanticRelease = async (
    paths?: string[] | null,
    inputOptions: InputOptions = {},
    {
        cwd = process.cwd(),
        env: environment = process.env,
        stderr = process.stderr,
        stdout = process.stdout,
    }: {
        cwd?: string;
        env?: NodeJS.ProcessEnv;
        stderr?: NodeJS.WriteStream;
        stdout?: NodeJS.WriteStream;
    } = {},
    _flags: Flags = {},
): Promise<Package[]> => {
    if (paths) {
        check(paths, "paths: string[]");
    }

    check(cwd, "cwd: directory");
    check(environment, "env: objectlike");
    check(stdout, "stdout: stream");
    check(stderr, "stderr: stream");

    // eslint-disable-next-line no-param-reassign
    cwd = cleanPath(cwd);

    const flags: Flags = {
        deps: {},
        ...await getConfigMultiSemrel(cwd, _flags),
    };

    // Setup logger.
    logger.config.stdio = [stderr, stdout];
    logger.config.level = flags.logLevel;

    if (flags.silent) {
        logger.config.level = "silent";
    }

    if (flags.debug) {
        logger.config.level = "debug";
    }

    logger.info(`multi-semantic-release version: ${multisemrelPackageJson.version}`);
    logger.info(`semantic-release version: ${semrelPkgJson.version}`);

    if (flags.debug) {
        logger.info(`flags: ${JSON.stringify(flags, null, 2)}`);
    }

    // Vars.
    const globalOptions: GlobalOptions = await getConfig(cwd);
    const multiContext: MultiContext = { cwd, env: environment, globalOptions, inputOptions, stderr, stdout };
    const { packages: _packages, queue } = await topo({
        cwd,
        filter: ({ manifest, manifestAbsPath, manifestRelPath }: { manifest: { private?: boolean }; manifestAbsPath: string; manifestRelPath: string }) =>
            (!flags.ignorePrivate || !manifest.private) && (paths ? paths.includes(manifestAbsPath) || paths.includes(manifestRelPath) : true),
        workspacesExtra: Array.isArray(flags.ignorePackages) ? flags.ignorePackages.map((p: string) => `!${p}`) : [],
    });

    // Get list of package.json paths according to workspaces.
    // eslint-disable-next-line no-param-reassign
    paths = paths || Object.values(_packages).map((package_: { manifestPath: string }) => package_.manifestPath);

    // Start.
    logger.complete(`Started multirelease! Loading ${paths.length} packages...`);

    // Load packages from paths.
    // eslint-disable-next-line compat/compat
    const packages: Package[] = await Promise.all(paths.map((path: string) => getPackage(path, multiContext)));

    packages.forEach((package_: Package) => {
        // Once we load all the packages we can find their cross refs
        // Make a list of local dependencies.
        // Map dependency names (e.g. my-awesome-dep) to their actual package objects in the packages array.
        // eslint-disable-next-line no-param-reassign
        package_.localDeps = [...new Set(package_.deps.map((d: string) => packages.find((p: Package) => d === p.name)).filter(Boolean))] as Package[];

        logger.success(`Loaded package ${package_.name}`);
    });

    logger.complete(`Queued ${queue.length} packages! Starting release...`);

    // Release all packages.
    const createInlinePlugin = createInlinePluginCreator(packages, multiContext, flags);
    // eslint-disable-next-line unicorn/no-array-reduce
    const released: number = await queue.reduce(async (_m: Promise<number>, _name: string) => {
        const m = await _m;
        const package_: Package | undefined = packages.find(({ name }: Package) => name === _name);

        if (package_) {
            const { result } = await releasePackage(package_, createInlinePlugin, multiContext, flags);

            if (result) {
                return m + 1;
            }
        }

        return m;
        // eslint-disable-next-line compat/compat
    }, Promise.resolve(0));

    // Return packages list.
    logger.complete(`Released ${released} of ${queue.length} packages, semantically!`);

    return sortBy(packages, ({ name }: Package) => queue.indexOf(name));
};

// Exports.
export default multiSemanticRelease;

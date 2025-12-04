import { dirname } from "node:path";

import { topo } from "@semrel-extra/topo";
import dbg from "debug";
// eslint-disable-next-line you-dont-need-lodash-underscore/cast-array
import { castArray, sortBy, template } from "lodash-es";
import type { Options } from "semantic-release";
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
import cleanPath from "./utils/clean-path";
import normalizeRepositoryUrl from "./utils/normalize-repository-url";
import { validate } from "./utils/validate";

/**
 * Load details about a package.
 * @param path The path to load details about.
 * @param allOptions Options that apply to all packages.
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
): Promise<Package | undefined> => {
    // eslint-disable-next-line no-param-reassign
    path = cleanPath(path, cwd);

    const directory = dirname(path);
    const manifest = getManifest(path);
    const { name } = manifest;

    const deps: string[] = Object.keys({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
    });

    const packageOptions = await getConfig(directory);
    const finalOptions: Record<string, unknown> = { ...globalOptions, ...packageOptions, ...inputOptions };

    // Normalize repository URL from manifest if not already set in options
    // This ensures git+https:// and git+ssh:// URLs from package.json are normalized before semantic-release processes them.
    // Note: When using token-based authentication (e.g., GITHUB_TOKEN), semantic-release automatically converts
    // repository URLs to HTTPS format regardless of the repositoryUrl format specified.
    if (!finalOptions.repositoryUrl && manifest.repository) {
        let repositoryUrl: string | undefined;

        if (typeof manifest.repository === "string") {
            repositoryUrl = manifest.repository;
        } else if (typeof manifest.repository === "object" && manifest.repository !== null && "url" in manifest.repository) {
            repositoryUrl = manifest.repository.url as string;
        }

        if (repositoryUrl) {
            finalOptions.repositoryUrl = normalizeRepositoryUrl(repositoryUrl);
        }
    }

    const envRecord: Record<string, string> = Object.fromEntries(
        Object.entries(env)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
    );
    const { options, plugins } = await getConfigSemantic({ cwd: directory, env: envRecord, stderr, stdout }, finalOptions);

    return { deps, dir: directory, localDeps: [], manifest, name, options, path, plugins } as Package;
};

/**
 * Release an individual package.
 * @param package_ The specific package.
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
    const { dir, name, options: packageOptions } = package_;
    const { env, stderr, stdout } = multiContext;

    const inlinePlugin = createInlinePlugin(package_);
    const options: Options = { ...packageOptions, ...inlinePlugin };

    const tagFormatContext = {
        name,
        // eslint-disable-next-line no-template-curly-in-string
        version: "${version}",
    };

    // eslint-disable-next-line no-template-curly-in-string
    const tagFormatDefault = "${name}@${version}";

    options.tagFormat = template(flags.tagFormat || tagFormatDefault)(tagFormatContext);
    options.debug = flags.debug;
    options.dryRun = flags.dryRun === undefined ? options.dryRun : flags.dryRun;
    options.ci = flags.ci === undefined ? options.ci : flags.ci;
    options.branches = flags.branches ? castArray(flags.branches) : options.branches;
    options._pkgOptions = packageOptions;

    // Normalize repositoryUrl to remove npm-specific prefixes (e.g., git+https:// -> https://, git+ssh:// -> ssh://)
    // This is necessary because git commands don't understand the git+ prefix used in package.json.
    // Note: When using token-based authentication, semantic-release automatically converts URLs to HTTPS format.
    if (options.repositoryUrl && typeof options.repositoryUrl === "string") {
        options.repositoryUrl = normalizeRepositoryUrl(options.repositoryUrl);
    }

    // Call semanticRelease() on the directory and save result to pkg.
    // Don't need to log out errors as semantic-release already does that.
    // eslint-disable-next-line no-param-reassign
    package_.result = (await semanticRelease(options, {
        cwd: dir,
        env,
        stderr: new RescopedStream(stderr, name) as unknown as NodeJS.WriteStream,
        stdout: new RescopedStream(stdout, name) as unknown as NodeJS.WriteStream,
    })) as Package["result"];

    return package_;
};

/**
 * The multi-release context.
 * @typedef {object} MultiContext
 * @property {Package[]} packages Array of all packages in this multirelease.
 * @property {Package[]} releasing Array of packages that will release.
 * @property {string} cwd The current working directory.
 * @property {object} env The environment variables.
 * @property {import('./logger').default} logger The logger for the multirelease.
 * @property {import('node:stream').WriteStream} stdout The output stream for this multirelease.
 * @property {import('node:stream').WriteStream} stderr The error stream for this multirelease.
 */

/**
 * Details about an individual package in a multirelease
 * @typedef {object} Package
 * @property {string} path String path to `package.json` for the package.
 * @property {string} dir The working directory for the package.
 * @property {string} name The name of the package, e.g. `my-amazing-package`
 * @property {string[]} deps Array of all dependency package names for the package (merging dependencies, devDependencies, peerDependencies).
 * @property {Package[]} localDeps Array of local dependencies this package relies on.
 * @property {import('semantic-release').Context|void} context The semantic-release context for this package's release (filled in once semantic-release runs).
 * @property {undefined|import('semantic-release').Result|false} result The result of semantic-release (object with lastRelease, nextRelease, commits, releases), false if this package was skipped (no changes or similar), or undefined if the package's release hasn't completed yet.
 * @property {object} _lastRelease The last release object for the package before its current release (set during anaylze-commit)
 * @property {object} _nextRelease The next release object (the release the package is releasing for this cycle) (set during generateNotes)
 */

/**
 * Perform a multirelease.
 * @param paths An array of paths to package.json files.
 * @param inputOptions An object containing semantic-release options.
 * @param settings An object containing: cwd, env, stdout, stderr (mainly for configuring tests).
 * @param settings.cwd
 * @param settings.env
 * @param settings.stderr
 * @param settings.stdout
 * @param flags Argv flags.
 * @returns Promise that resolves to a list of package objects with `result` property describing whether it released or not.
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
    flags: Flags = {},
): Promise<Package[]> => {
    if (paths) {
        validate(paths, "paths: string[]");
    }

    validate(cwd, "cwd: directory");
    validate(environment, "env: objectlike");
    validate(stdout, "stdout: stream");
    validate(stderr, "stderr: stream");

    // eslint-disable-next-line no-param-reassign
    cwd = cleanPath(cwd);

    const configMultiSemrel = await getConfigMultiSemrel(cwd, flags);

    const mergedFlags: Flags = {
        deps: {},
        ...configMultiSemrel,
        ...flags,
    };

    logger.config.stdio = [stderr, stdout];
    logger.config.level = mergedFlags.logLevel as string;

    if (mergedFlags.silent) {
        logger.config.level = "silent";
    }

    if (mergedFlags.debug) {
        logger.config.level = "debug";

        let extraDebug = "";

        if (environment.DEBUG) {
            extraDebug = `,${environment.DEBUG}`;
        }

        dbg.enable(`msr:*,semantic-release:*${extraDebug}`);
    }

    (logger as { info: (...args: unknown[]) => void }).info(`multi-semantic-release version: ${multisemrelPackageJson.version}`);
    (logger as { info: (...args: unknown[]) => void }).info(`semantic-release version: ${semrelPkgJson.version}`);

    if (mergedFlags.debug) {
        (logger as { info: (...args: unknown[]) => void }).info(`flags: ${JSON.stringify(mergedFlags, null, 2)}`);
    }

    const globalOptions: GlobalOptions = await getConfig(cwd);
    const multiContext: MultiContext = { cwd, env: environment as NodeJS.ProcessEnv, globalOptions, inputOptions, stderr, stdout };
    const { packages: allPackages, queue } = await topo({
        cwd,
        filter: ((entry: { manifest: { private?: boolean }; manifestAbsPath: string; manifestRelPath: string }) => {
            const manifest = entry.manifest as { private?: boolean };

            return (
                (!mergedFlags.ignorePrivate || !manifest.private)
                && (paths ? paths.includes(entry.manifestAbsPath) || paths.includes(entry.manifestRelPath) : true)
            );
        }) as (entry: unknown) => boolean,
        workspacesExtra: Array.isArray(mergedFlags.ignorePackages) ? mergedFlags.ignorePackages.map((p: string) => `!${p}`) : [],
    });

    // eslint-disable-next-line no-param-reassign
    paths = paths || Object.values(allPackages).map((pkg: { manifestPath: string }) => pkg.manifestPath);

    (logger as { complete: (...args: unknown[]) => void }).complete(`Started multirelease! Loading ${paths.length} packages...`);

    let packages: Package[] = (await Promise.all(paths.map((path: string) => getPackage(path, multiContext)))) as Package[];

    packages = packages.filter((pkg): pkg is Package => pkg !== undefined) as Package[];

    packages.forEach((package_: Package) => {
        // eslint-disable-next-line no-param-reassign
        package_.localDeps = [...new Set(package_.deps.map((d: string) => packages.find((p: Package) => d === p.name)).filter(Boolean))] as Package[];

        (logger as { success: (...args: unknown[]) => void }).success(`Loaded package ${package_.name}`);
    });

    (logger as { complete: (...args: unknown[]) => void }).complete(`Queued ${queue.length} packages! Starting release...`);

    const createInlinePlugin = createInlinePluginCreator(packages, multiContext, mergedFlags) as (package_: Package) => Record<string, unknown>;
    // eslint-disable-next-line unicorn/no-array-reduce
    const released: number = await queue.reduce(async (previousCount: Promise<number>, packageName: string) => {
        const count = await previousCount;
        const pkg: Package | undefined = packages.find(({ name }: Package) => name === packageName);

        if (pkg) {
            const { result } = await releasePackage(pkg, createInlinePlugin, multiContext, mergedFlags);

            if (result) {
                return count + 1;
            }
        }

        return count;
    }, Promise.resolve(0));

    (logger as { complete: (...args: unknown[]) => void }).complete(`Released ${released} of ${queue.length} packages, semantically!`);

    return sortBy(packages, ({ name }: Package) => queue.indexOf(name));
};

export default multiSemanticRelease;

/* eslint-disable jsdoc/match-description */
// eslint-disable-next-line e18e/ban-dependencies
import { execa } from "execa";
import { getTagHead } from "semantic-release/lib/git.js";
import type { ReleaseType } from "semver";

import getCommitsFiltered from "./get-commits-filtered";
import logger from "./logger";
import type { Flags, MultiContext, Package, PackageCatalogChange, RootFileChanges, SemanticReleaseContext } from "./types";
import { resolveReleaseType, resolveReleaseTypeFromStrategy, updateManifestDeps as updateManifestDependencies } from "./update-deps";
import cleanPath from "./utils/clean-path";
import type { CatalogChanges } from "./utils/detect-catalog-changes";
import { detectCatalogChanges, getPackageCatalogChanges } from "./utils/detect-catalog-changes";
import { createRootFileChangeDetector, formatRootFileChanges } from "./utils/detect-root-file-changes";
import memoize from "./utils/memoize";
import { maxReleaseType } from "./utils/release-type";

// Keep the scoped logger: its level methods read `this`, so they can't be destructured like `debug`
const scopedLogger = logger.withScope("msr:inlinePlugin");
const { debug } = scopedLogger;

const HEADING_VERSION_REGEX = /^(#+) (\[?\d+\.\d+\.\d+\]?)/u;

/** Changes besides commits that trigger a release of a package, and the release type they trigger. */
interface ReleaseTrigger<T> {
    changes: T;
    releaseType?: string;
}

interface InlinePluginFunctions {
    analyzeCommits?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<string | null>;
    generateNotes?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<string>;
    prepare?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<void>;
    publish?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<unknown>;
    verifyConditions?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<void>;
    verifyRelease?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<void>;
}

/**
 * Create an inline plugin creator for a multirelease.
 * This is caused once per multirelease and returns a function which should be called once per package within the release.
 * @param _packages The multi-semantic-release context.
 * @param multiContext The multi-semantic-release context.
 * @param flags argv options
 * @returns A function that creates an inline package.
 * @internal
 */
const createInlinePluginCreator = (_packages: Package[], multiContext: MultiContext, flags: Flags): ((npmPackage: Package) => InlinePluginFunctions) => {
    const { cwd } = multiContext;
    // Catalog changes are detected per package, since that package's own last release.
    // Packages sharing a last-release commit share the (cached) detection.
    const catalogChangesByGitHead = new Map<string, Promise<CatalogChanges>>();
    const getRootFileChangesSince = createRootFileChangeDetector(cwd, flags);

    const getCatalogChangesSince = async (gitHead: string, debugPrefix: string): Promise<CatalogChanges> =>
        await memoize(catalogChangesByGitHead, gitHead, async () => {
            try {
                return await detectCatalogChanges(cwd, gitHead);
            } catch (error) {
                // Catalog changes never failed a release, so keep skipping them, but visibly (e.g. in a shallow clone).
                scopedLogger.warn(debugPrefix, "Failed to detect catalog changes, skipping them:", error);

                return {};
            }
        });

    /**
     * Get the catalog changes a package depends on since its last release, and the release type they trigger.
     * @param npmPackage The package being analyzed.
     * @param gitHead The commit of the package's last release.
     * @param debugPrefix The prefix for debug messages.
     * @returns The package's catalog changes, with the release type mapped through `deps.release`.
     */
    const getCatalogTrigger = async (npmPackage: Package, gitHead: string, debugPrefix: string): Promise<ReleaseTrigger<PackageCatalogChange[]>> => {
        const changes = getPackageCatalogChanges(npmPackage, await getCatalogChangesSince(gitHead, debugPrefix));

        if (changes.length === 0) {
            return { changes };
        }

        const rawReleaseType = maxReleaseType(...changes.map(({ releaseType }) => releaseType)) ?? "patch";
        // Apply deps.release strategy to catalog-triggered release types,
        // just like workspace dependency bumps go through resolveReleaseTypeFromStrategy.
        // Without this, a major catalog dependency bump (e.g. @actions/core 2→3)
        // would directly cause a major release in consuming packages, ignoring the
        // configured strategy (default: "patch").
        const releaseType = flags.deps?.release ? resolveReleaseTypeFromStrategy(flags.deps.release, rawReleaseType) : rawReleaseType;

        debug(debugPrefix, `Catalog change triggers ${releaseType ?? ""} release (raw: ${rawReleaseType})`);

        return { changes, releaseType };
    };

    /**
     * Get the root file changes since a package's last release, and the release type they trigger.
     * @param npmPackage The package being analyzed.
     * @param gitHead The commit of the package's last release.
     * @param debugPrefix The prefix for debug messages.
     * @returns The root file changes, with the release type mapped through `rootFiles.release`; no changes if they trigger nothing.
     */
    const getRootFileTrigger = async (npmPackage: Package, gitHead: string, debugPrefix: string): Promise<ReleaseTrigger<RootFileChanges | undefined>> => {
        const changes = await getRootFileChangesSince(npmPackage, gitHead);

        if (!changes) {
            return { changes };
        }

        const releaseType = resolveReleaseTypeFromStrategy(flags.rootFiles?.release ?? "patch", changes.releaseType);

        debug(debugPrefix, `Root file changes trigger ${releaseType ?? "no"} release (raw: ${changes.releaseType})`);

        return releaseType ? { changes, releaseType } : { changes: undefined };
    };

    const createInlinePlugin = (npmPackage: Package): InlinePluginFunctions => {
        const { dir, name, plugins } = npmPackage;
        const debugPrefix = `[${name}]`;

        const applyPackageOptions = (context: SemanticReleaseContext): void => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            context.options ??= {};

            // Before any step runs, semantic-release replaces options.repositoryUrl with the
            // authenticated push URL it resolved (getGitAuthUrl) and keeps the raw one as
            // options.originalRepositoryURL. npmPackage.options still holds the raw manifest URL,
            // so re-applying it below would hand the nested plugins a URL with no credentials and
            // break push-back on hosts that require them (see #241).
            const { repositoryUrl } = context.options;

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions ?? {});

            if (repositoryUrl) {
                context.options.repositoryUrl = repositoryUrl;
            }
        };

        /**
         * @param _pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns void
         * @internal
         */
        const verifyConditions = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<void> => {
            applyPackageOptions(context);

            context.cwd = dir;

            if (plugins.verifyConditions) {
                await plugins.verifyConditions(context);
            }

            // eslint-disable-next-line no-param-reassign
            npmPackage._ready = true;

            debug(debugPrefix, "verified conditions");

            return undefined;
        };

        /**
         * Analyze commits step.
         * Responsible for determining the type of the next release (major, minor or patch). If multiple plugins with a analyzeCommits step are defined, the release type will be the highest one among plugins output.
         *
         * In multirelease: Returns "patch" if the package contains references to other local packages that have changed, or null if this package references no local packages or they have not changed.
         * Also updates the `context.commits` setting with one returned from `getCommitsFiltered()` (which is filtered by package directory).
         * @param _pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns Promise that resolves when done.
         * @internal
         */
        const analyzeCommits = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<string | null> => {
            if (!context.branch) {
                throw new Error("context.branch is required");
            }

            applyPackageOptions(context);

            // eslint-disable-next-line no-param-reassign
            npmPackage._preRelease = context.branch.prerelease ?? null;
            // eslint-disable-next-line no-param-reassign
            npmPackage._branch = context.branch.name;

            // Log branch and channel info for debugging
            if (context.branch.channel) {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                debug(debugPrefix, `Branch channel: ${String(context.branch.channel)}`);
            }

            context.cwd = dir;

            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? context.lastRelease.gitHead : undefined,
                context.nextRelease ? context.nextRelease.gitHead : undefined,
                firstParentBranch,
            );

            // eslint-disable-next-line no-param-reassign
            npmPackage._lastRelease = context.lastRelease;

            // Catalog and root file (e.g. pnpm-lock.yaml) changes since this package's last release can trigger a release too
            const lastReleaseGitHead = context.lastRelease?.gitHead;
            const catalogTrigger: ReleaseTrigger<PackageCatalogChange[]> = lastReleaseGitHead
                ? await getCatalogTrigger(npmPackage, lastReleaseGitHead, debugPrefix)
                : { changes: [] };
            const rootFileTrigger: ReleaseTrigger<RootFileChanges | undefined> = lastReleaseGitHead
                ? await getRootFileTrigger(npmPackage, lastReleaseGitHead, debugPrefix)
                : { changes: undefined };

            // eslint-disable-next-line no-param-reassign
            npmPackage._catalogChanges = catalogTrigger.changes;
            // eslint-disable-next-line no-param-reassign
            npmPackage._rootFileChanges = rootFileTrigger.changes;

            let nextType: string | undefined;

            if (plugins.analyzeCommits) {
                nextType = (await plugins.analyzeCommits(context)) ?? undefined;
            }

            // If catalog or root file changes triggered a release as well, use the highest severity
            nextType = maxReleaseType(nextType, catalogTrigger.releaseType, rootFileTrigger.releaseType);

            // eslint-disable-next-line no-param-reassign
            npmPackage._nextType = nextType as ReleaseType | null | undefined;

            // eslint-disable-next-line no-param-reassign
            npmPackage._analyzed = true;

            if (flags.deps) {
                // eslint-disable-next-line no-param-reassign
                npmPackage._nextType = resolveReleaseType(npmPackage, flags.deps.bump, flags.deps.release, [], flags.deps.prefix) as
                    ReleaseType | null | undefined;
            }

            debug(debugPrefix, "commits analyzed");
            debug(debugPrefix, `release type: ${npmPackage._nextType ?? "none"}`);

            return npmPackage._nextType ?? null;
        };

        /**
         * Generates release notes for the package.
         * Responsible for generating the content of the release note.
         * If multiple plugins with a generateNotes step are defined, the release notes will be the result of the concatenation of each plugin output.
         * In multirelease, edits the H2 to insert the package name and adds an upgrades section to the note.
         * We want this at the _end_ of the release note which is why it's stored in steps-after.
         *
         * Should look like:
         *
         * ## my-amazing-package [9.2.1](github.com/etc) 2018-12-01
         *
         * ### Features
         *
         * etc
         *
         * ### Dependencies
         *
         * **my-amazing-plugin:** upgraded to 1.2.3
         * **my-other-plugin:** upgraded to 4.9.6
         * @param _pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns Promise that resolves to the string.
         * @internal
         */
        const generateNotes = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<string> => {
            applyPackageOptions(context);

            context.cwd = dir;

            // eslint-disable-next-line no-param-reassign
            npmPackage._nextRelease = context.nextRelease;

            // Log channel information for debugging
            if (context.nextRelease?.channel) {
                debug(debugPrefix, `Release channel: ${context.nextRelease.channel}`);
            }

            const notes = [];

            if (context.lastRelease?.gitTag && (!context.lastRelease.gitHead || context.lastRelease.gitHead === context.lastRelease.gitTag)) {
                // Get repository root to ensure consistent tag lookup
                const root = await execa("git", ["rev-parse", "--show-toplevel"], { cwd: context.cwd });
                const gitRoot = cleanPath(root.stdout);

                context.lastRelease.gitHead = await getTagHead(context.lastRelease.gitTag, {
                    cwd: gitRoot,
                    env: context.env,
                });
            }

            if (!context.branch) {
                throw new Error("context.branch is required");
            }

            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? context.lastRelease.gitHead : undefined,
                context.nextRelease ? context.nextRelease.gitHead : undefined,
                firstParentBranch,
            );

            let subs: string | undefined;

            if (plugins.generateNotes) {
                subs = await plugins.generateNotes(context);
            }

            if (subs) {
                // eslint-disable-next-line unicorn/no-unsafe-string-replacement
                notes.push(subs.replace(HEADING_VERSION_REGEX, `$1 ${name} $2`));
            }

            const upgrades = npmPackage.localDeps.filter((d: Package) => d._nextRelease);
            const catalogChanges = npmPackage._catalogChanges ?? [];
            // A catalog bump also changes the lock file: list it once, as the catalog change.
            const rootFileNotes = formatRootFileChanges(npmPackage._rootFileChanges, new Set(catalogChanges.map(({ dependencyName }) => dependencyName)));

            if (upgrades.length > 0 || catalogChanges.length > 0 || rootFileNotes.length > 0) {
                notes.push(`### Dependencies`);

                const bullets = upgrades
                    .map((d: Package) => {
                        const nextRelease = d._nextRelease;

                        if (!nextRelease) {
                            return "";
                        }

                        return `* **${d.name}:** upgraded to ${nextRelease.version}`;
                    })
                    .filter(Boolean);

                for (const change of catalogChanges) {
                    bullets.push(`* **${change.dependencyName}:** ${change.oldVersion} → ${change.newVersion}`);
                }

                bullets.push(...rootFileNotes);

                notes.push(bullets.join("\n"));
            }

            debug(debugPrefix, "notes generated");

            return notes.join("\n\n");
        };

        const prepare = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<void> => {
            applyPackageOptions(context);

            if (flags.dryRun) {
                debug(debugPrefix, "skipping prepare in dry-run mode");

                return;
            }

            updateManifestDependencies(npmPackage);

            // eslint-disable-next-line no-param-reassign
            npmPackage._depsUpdated = true;
            context.cwd = dir;

            if (!context.branch) {
                throw new Error("context.branch is required");
            }

            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? context.lastRelease.gitHead : undefined,
                context.nextRelease ? context.nextRelease.gitHead : undefined,
                firstParentBranch,
            );

            if (plugins.prepare) {
                await plugins.prepare(context);
            }

            // eslint-disable-next-line no-param-reassign
            npmPackage._prepared = true;

            debug(debugPrefix, "prepared");
        };

        const publish = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<unknown> => {
            applyPackageOptions(context);

            if (flags.dryRun) {
                debug(debugPrefix, "skipping publish in dry-run mode");

                return [];
            }

            context.cwd = dir;

            let result: unknown[] = [];

            if (plugins.publish) {
                const publishResult = await plugins.publish(context);

                if (publishResult !== undefined) {
                    result = Array.isArray(publishResult) ? publishResult : [publishResult];
                }
            }

            // eslint-disable-next-line no-param-reassign
            npmPackage._published = true;

            debug(debugPrefix, "published");

            return result.length > 0 ? result[0] : {};
        };

        /**
         * Verify release step.
         * Responsible for verifying the release that was just published. If multiple plugins with a verifyRelease step are defined, all must pass.
         *
         * In multi-release: Ensures context.cwd is set to the package directory so plugins can verify package-specific artifacts.
         * @param _pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns Promise that resolves when done.
         * @internal
         */
        const verifyRelease = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<void> => {
            applyPackageOptions(context);
            context.cwd = dir;

            await plugins.verifyRelease?.(context);

            debug(debugPrefix, "release verified");
        };

        const inlinePlugin = {
            analyzeCommits,
            generateNotes,
            prepare,
            publish,
            verifyConditions,
            verifyRelease,
        };

        Object.keys(inlinePlugin).forEach((type: string) =>
            Reflect.defineProperty(inlinePlugin[type as keyof typeof inlinePlugin], "pluginName", {
                enumerable: true,
                value: "Inline plugin",
                writable: false,
            }),
        );

        debug(debugPrefix, "inlinePlugin created");

        return inlinePlugin;
    };

    return createInlinePlugin;
};

export default createInlinePluginCreator;

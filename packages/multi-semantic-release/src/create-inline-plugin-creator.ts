/* eslint-disable jsdoc/match-description */
import { getTagHead } from "semantic-release/lib/git.js";
import type { ReleaseType } from "semver";

import getCommitsFiltered from "./get-commits-filtered";
import logger from "./logger";
import type { Flags, MultiContext, Package, SemanticReleaseContext } from "./types";
import { resolveReleaseType, updateManifestDeps } from "./update-deps";
import { detectCatalogChanges, getAffectedPackagesFromCatalogChanges } from "./utils/detect-catalog-changes";

const { debug } = logger.withScope("msr:inlinePlugin");

interface InlinePluginFunctions {
    analyzeCommits?: (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext) => Promise<string | null | undefined>;
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
const createInlinePluginCreator = (_packages: Package[], multiContext: MultiContext, flags: Flags): (npmPackage: Package) => InlinePluginFunctions => {
    const { cwd } = multiContext;
    // Cache catalog changes detection - only run once per multirelease
    let catalogChangesCache: Map<string, "major" | "minor" | "patch"> | null = null;
    let catalogChangesDetected = false;

    const createInlinePlugin = (npmPackage: Package): InlinePluginFunctions => {
        const { dir, name, plugins } = npmPackage;
        const debugPrefix = `[${name}]`;

        /**
         * @param _pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns void
         * @internal
         */
        const verifyConditions = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<void> => {
            if (!context.options) {
                context.options = {};
            }

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions || {});
            Object.assign(npmPackage.fakeLogger, context.logger || {});
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
        // eslint-disable-next-line sonarjs/cognitive-complexity
        const analyzeCommits = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<string | null> => {
            if (!context.branch) {
                throw new Error("context.branch is required");
            }

            if (!context.options) {
                context.options = {};
            }

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions || {});

            // eslint-disable-next-line no-param-reassign
            npmPackage._preRelease = context.branch.prerelease || null;
            // eslint-disable-next-line no-param-reassign
            npmPackage._branch = context.branch.name;

            context.cwd = dir;

            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? (context.lastRelease.gitHead as string | undefined) : undefined,
                context.nextRelease ? (context.nextRelease.gitHead as string | undefined) : undefined,
                firstParentBranch,
            );

            // eslint-disable-next-line no-param-reassign
            npmPackage._lastRelease = context.lastRelease;

            // Detect catalog changes (only once per multirelease)
            if (!catalogChangesDetected && context.lastRelease?.gitHead) {
                try {
                    const catalogChanges = await detectCatalogChanges(
                        cwd,
                        context.lastRelease.gitHead as string,
                        context.nextRelease?.gitHead as string | undefined,
                    );

                    if (Object.keys(catalogChanges).length > 0) {
                        catalogChangesCache = getAffectedPackagesFromCatalogChanges(_packages, catalogChanges);
                        catalogChangesDetected = true;

                        debug(debugPrefix, `Detected catalog changes affecting ${catalogChangesCache.size} packages`);
                    } else {
                        catalogChangesDetected = true; // Mark as checked even if no changes
                    }
                } catch (error) {
                    debug(debugPrefix, "Failed to detect catalog changes:", error);
                    catalogChangesDetected = true; // Mark as checked to avoid repeated failures
                }
            }

            // Check if this package is affected by catalog changes
            let catalogTriggeredReleaseType: string | null = null;

            if (catalogChangesCache && catalogChangesCache.has(npmPackage.name)) {
                catalogTriggeredReleaseType = catalogChangesCache.get(npmPackage.name);

                debug(debugPrefix, `Catalog change triggers ${catalogTriggeredReleaseType} release`);
            }

            let nextType: string | null | undefined = null;

            if (plugins.analyzeCommits) {
                nextType = await plugins.analyzeCommits(context);
            }

            // If catalog changes triggered a release and no commits triggered one, use catalog release type
            if (!nextType && catalogTriggeredReleaseType) {
                nextType = catalogTriggeredReleaseType;
            } else if (nextType && catalogTriggeredReleaseType) {
                // If both catalog and commits triggered releases, use the highest severity
                const severityOrder = { major: 3, minor: 2, patch: 1 };
                const commitSeverity = severityOrder[nextType as keyof typeof severityOrder] || 0;
                const catalogSeverity = severityOrder[catalogTriggeredReleaseType as keyof typeof severityOrder] || 0;

                if (catalogSeverity > commitSeverity) {
                    nextType = catalogTriggeredReleaseType;
                }
            }

            // eslint-disable-next-line no-param-reassign
            npmPackage._nextType = nextType as ReleaseType | null | undefined;

            // eslint-disable-next-line no-param-reassign
            npmPackage._analyzed = true;

            if (flags.deps) {
                // eslint-disable-next-line no-param-reassign
                npmPackage._nextType = resolveReleaseType(npmPackage, flags.deps.bump, flags.deps.release, [], flags.deps.prefix) as
                | ReleaseType
                | null
                | undefined;
            }

            debug(debugPrefix, "commits analyzed");
            debug(debugPrefix, `release type: ${npmPackage._nextType}`);

            return npmPackage._nextType as string | null;
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
            if (!context.options) {
                context.options = {};
            }

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions || {});

            context.cwd = dir;

            // eslint-disable-next-line no-param-reassign
            npmPackage._nextRelease = context.nextRelease;

            const notes = [];

            if (
                context.lastRelease
                && context.lastRelease.gitTag
                && (!context.lastRelease.gitHead || context.lastRelease.gitHead === context.lastRelease.gitTag)
            ) {
                context.lastRelease.gitHead = await getTagHead(context.lastRelease.gitTag as string, {
                    cwd: context.cwd,
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
                context.lastRelease ? (context.lastRelease.gitHead as string | undefined) : undefined,
                context.nextRelease ? (context.nextRelease.gitHead as string | undefined) : undefined,
                firstParentBranch,
            );

            let subs: string | undefined;

            if (plugins.generateNotes) {
                subs = await plugins.generateNotes(context);
            }

            // istanbul ignore else (unnecessary to __tests__)
            if (subs) {
                notes.push(subs.replace(/^(#+) (\[?\d+\.\d+\.\d+\]?)/u, `$1 ${name} $2`));
            }

            const upgrades = npmPackage.localDeps.filter((d: Package) => d._nextRelease);

            if (upgrades.length > 0) {
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

                notes.push(bullets.join("\n"));
            }

            debug(debugPrefix, "notes generated");

            return notes.join("\n\n");
        };

        const prepare = async (_pluginOptions: Record<string, unknown> | undefined, context: SemanticReleaseContext): Promise<void> => {
            if (!context.options) {
                context.options = {};
            }

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions || {});

            if (flags.dryRun) {
                debug(debugPrefix, "skipping prepare in dry-run mode");

                return;
            }

            updateManifestDeps(npmPackage);

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
                context.lastRelease ? (context.lastRelease.gitHead as string | undefined) : undefined,
                context.nextRelease ? (context.nextRelease.gitHead as string | undefined) : undefined,
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
            if (!context.options) {
                context.options = {};
            }

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions || {});

            if (flags.dryRun) {
                debug(debugPrefix, "skipping publish in dry-run mode");

                return [];
            }

            context.cwd = dir;

            let result: unknown[] = [];

            if (plugins.publish) {
                const publishResult = await plugins.publish?.(context);

                if (publishResult !== undefined) {
                    result = Array.isArray(publishResult) ? publishResult : [publishResult];
                }
            }

            // eslint-disable-next-line no-param-reassign
            npmPackage._published = true;

            debug(debugPrefix, "published");

            // istanbul ignore next
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
            if (!context.options) {
                context.options = {};
            }

            Object.assign(context.options, npmPackage.options);
            Object.assign(context.options, context.options._pkgOptions || {});
            context.cwd = dir;

            await plugins?.verifyRelease?.(context);

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

        return inlinePlugin as InlinePluginFunctions;
    };

    return createInlinePlugin;
};

export default createInlinePluginCreator;

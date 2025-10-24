import { getTagHead } from "semantic-release/lib/git.js";

import getCommitsFiltered from "./get-commits-filtered";
import logger from "./logger";
import type { Flags, MultiContext, Package, PluginFunctions, SemanticReleaseContext } from "./types";
import { resolveReleaseType, updateManifestDeps } from "./update-deps";

const { debug } = logger.withScope("msr:inlinePlugin");

/**
 * Create an inline plugin creator for a multirelease.
 * This is caused once per multirelease and returns a function which should be called once per package within the release.
 * @param packages The multi-semantic-release context.
 * @param multiContext The multi-semantic-release context.
 * @param flags argv options
 * @returns A function that creates an inline package.
 * @internal
 */
const createInlinePluginCreator = (packages: Package[], multiContext: MultiContext, flags: Flags): (npmPackage: Package) => PluginFunctions => {
    // Vars.
    const { cwd } = multiContext;

    /**
     * Create an inline plugin for an individual package in a multirelease.
     * This is called once per package and returns the inline plugin used for semanticRelease()
     * @param npmPackage The package this function is being called on.
     * @returns A semantic-release inline plugin containing plugin step functions.
     * @internal
     */

    /**
     * @param npmPackage
     */
    const createInlinePlugin = (npmPackage: Package): PluginFunctions => {
        // Vars.
        const { dir, name, plugins } = npmPackage;
        const debugPrefix = `[${name}]`;

        /**
         * @param pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns void
         * @internal
         */
        const verifyConditions = async (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext): Promise<void> => {
            // Restore context for plugins that does not rely on parsed opts.
            Object.assign(context.options, context.options._pkgOptions);

            // And bind the actual logger.
            Object.assign(npmPackage.fakeLogger, context.logger);

            // Ensure context.cwd is set to the package directory
            // This is critical for plugins that need to access package-specific files
            // eslint-disable-next-line no-param-reassign
            context.cwd = dir;

            const result = await plugins.verifyConditions(context);

            // eslint-disable-next-line no-param-reassign
            npmPackage._ready = true;

            debug(debugPrefix, "verified conditions");

            return result;
        };

        /**
         * Analyze commits step.
         * Responsible for determining the type of the next release (major, minor or patch). If multiple plugins with a analyzeCommits step are defined, the release type will be the highest one among plugins output.
         *
         * In multirelease: Returns "patch" if the package contains references to other local packages that have changed, or null if this package references no local packages or they have not changed.
         * Also updates the `context.commits` setting with one returned from `getCommitsFiltered()` (which is filtered by package directory).
         * @param pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns Promise that resolves when done.
         * @internal
         */
        const analyzeCommits = async (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext): Promise<string | null> => {
            // eslint-disable-next-line no-param-reassign
            npmPackage._preRelease = context.branch.prerelease || null;
            // eslint-disable-next-line no-param-reassign
            npmPackage._branch = context.branch.name;

            // Ensure context.cwd is set to the package directory
            // eslint-disable-next-line no-param-reassign
            context.cwd = dir;

            // Filter commits by directory.
            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            // Set context.commits so analyzeCommits does correct analysis.

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? context.lastRelease.gitHead : undefined,
                context.nextRelease ? context.nextRelease.gitHead : undefined,
                firstParentBranch,
            );

            // Set lastRelease for package from context.
            // eslint-disable-next-line no-param-reassign
            npmPackage._lastRelease = context.lastRelease;

            // Set nextType for package from plugins.
            // eslint-disable-next-line no-param-reassign
            npmPackage._nextType = await plugins.analyzeCommits(context);

            // eslint-disable-next-line no-param-reassign
            npmPackage._analyzed = true;

            // Make sure type is "patch" if the package has any deps that have been changed.
            // eslint-disable-next-line no-param-reassign
            npmPackage._nextType = resolveReleaseType(npmPackage, flags.deps.bump, flags.deps.release, [], flags.deps.prefix);

            debug(debugPrefix, "commits analyzed");
            debug(debugPrefix, `release type: ${npmPackage._nextType}`);

            // Return type.
            return npmPackage._nextType;
        };

        /**
         * Generate notes step (after).
         * Responsible for generating the content of the release note. If multiple plugins with a generateNotes step are defined, the release notes will be the result of the concatenation of each plugin output.
         *
         * In multirelease: Edit the H2 to insert the package name and add an upgrades section to the note.
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
         * @param pluginOptions Options to configure this plugin.
         * @param context The semantic-release context.
         * @returns Promise that resolves to the string
         * @internal
         */
        const generateNotes = async (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext): Promise<string> => {
            // Set nextRelease for package.
            // eslint-disable-next-line no-param-reassign
            npmPackage._nextRelease = context.nextRelease;

            // Wait until all todo packages are ready to generate notes.
            // await waitForAll("_nextRelease", (p) => p._nextType);

            // Vars.
            const notes = [];

            // get SHA of lastRelease if not already there (should have been done by Semantic Release...)
            if (
                context.lastRelease
                && context.lastRelease.gitTag
                && (!context.lastRelease.gitHead || context.lastRelease.gitHead === context.lastRelease.gitTag)
            ) {
                context.lastRelease.gitHead = getTagHead(context.lastRelease.gitTag, {
                    cwd: context.cwd,
                    env: context.env,
                });
            }

            // Filter commits by directory (and release range)
            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            // Set context.commits so generateNotes does correct analysis.

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? context.lastRelease.gitHead : undefined,
                context.nextRelease ? context.nextRelease.gitHead : undefined,
                firstParentBranch,
            );

            // Get subnotes and add to list.
            // Inject pkg name into title if it matches e.g. `# 1.0.0` or `## [1.0.1]` (as generate-release-notes does).
            const subs = await plugins.generateNotes(context);

            // istanbul ignore else (unnecessary to __tests__)
            if (subs) {
                notes.push(subs.replace(/^(#+) (\[?\d+\.\d+\.\d+\]?)/u, `$1 ${name} $2`));
            }

            // If it has upgrades add an upgrades section.
            const upgrades = npmPackage.localDeps.filter((d: Package) => d._nextRelease);

            if (upgrades.length > 0) {
                notes.push(`### Dependencies`);

                const bullets = upgrades.map((d: Package) => `* **${d.name}:** upgraded to ${d._nextRelease!.version}`);

                notes.push(bullets.join("\n"));
            }

            debug(debugPrefix, "notes generated");

            // Return the notes.
            return notes.join("\n\n");
        };

        const prepare = async (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext): Promise<void> => {
            // Skip all operations in dry-run mode
            if (flags.dryRun) {
                debug(debugPrefix, "skipping prepare in dry-run mode");

                return;
            }

            updateManifestDeps(npmPackage);

            // eslint-disable-next-line no-param-reassign
            npmPackage._depsUpdated = true;

            // Ensure context.cwd is set to the package directory
            // eslint-disable-next-line no-param-reassign
            context.cwd = dir;

            // Filter commits by directory.
            const firstParentBranch = flags.firstParent ? context.branch.name : undefined;

            // Set context.commits so analyzeCommits does correct analysis.

            context.commits = await getCommitsFiltered(
                cwd,
                dir,
                context.lastRelease ? context.lastRelease.gitHead : undefined,
                context.nextRelease ? context.nextRelease.gitHead : undefined,
                firstParentBranch,
            );

            const result = await plugins.prepare(context);

            // eslint-disable-next-line no-param-reassign
            npmPackage._prepared = true;

            debug(debugPrefix, "prepared");

            return result;
        };

        const publish = async (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext): Promise<unknown> => {
            // Skip all operations in dry-run mode
            if (flags.dryRun) {
                debug(debugPrefix, "skipping publish in dry-run mode");

                return [];
            }

            // Ensure context.cwd is set to the package directory
            // eslint-disable-next-line no-param-reassign
            context.cwd = dir;

            const result = await plugins.publish(context);

            // eslint-disable-next-line no-param-reassign
            npmPackage._published = true;

            debug(debugPrefix, "published");

            // istanbul ignore next
            return result.length > 0 ? result[0] : {};
        };

        const inlinePlugin = {
            analyzeCommits,
            generateNotes,
            prepare,
            publish,
            verifyConditions,
        };

        // Add labels for logs.
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

    // Return creator function.
    return createInlinePlugin;
};

// Exports.
export default createInlinePluginCreator;

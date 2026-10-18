import { relative } from "@visulima/path";

import logger from "../logger";
import type { DependencyVersionChange, Flags, Package, RootFileChanges } from "../types";
import { getChangedFiles, getHeadCommit, readFileAtCommit } from "./git";
import memoize from "./memoize";
import type { PnpmLockfile } from "./pnpm-lockfile";
import { compareDependencyGraphs, isSupportedLockfile, parsePnpmLockfile, PNPM_LOCKFILE, ROOT_IMPORTER } from "./pnpm-lockfile";

const { debug } = logger.withScope("msr:rootFileChanges");

/**
 * Describe root files that trigger a release as a whole, without analyzing their content.
 * @param files The changed root files.
 * @returns The root file changes, as a patch.
 */
const getFileChanges = (files: string[]): RootFileChanges => {
    return { dependencies: [], files, releaseType: "patch", transitiveCount: 0 };
};

/**
 * Read the pnpm lock file of a commit.
 * @param cwd The workspace root directory.
 * @param gitHead The commit to read from.
 * @returns The parsed lock file, or undefined if the commit has no lock file.
 */
const readPnpmLockfile = async (cwd: string, gitHead: string): Promise<PnpmLockfile | undefined> => {
    const content = await readFileAtCommit(cwd, gitHead, PNPM_LOCKFILE);

    if (content === undefined) {
        debug(`No ${PNPM_LOCKFILE} at ${gitHead}`);

        return undefined;
    }

    return parsePnpmLockfile(content);
};

const formatDependencyChange = ({ name, newVersion, oldVersion }: DependencyVersionChange): string => {
    if (oldVersion === undefined) {
        return `* **${name}:** added ${String(newVersion)}`;
    }

    return newVersion === undefined ? `* **${name}:** removed ${oldVersion}` : `* **${name}:** ${oldVersion} → ${newVersion}`;
};

/**
 * Format root file changes as release note bullets for the "Dependencies" section.
 * @param changes The root file changes that triggered the release.
 * @returns One bullet per changed direct dependency and file, plus a count of further updated packages.
 */
const formatRootFileChanges = (changes: RootFileChanges | undefined): string[] => {
    if (!changes) {
        return [];
    }

    const bullets = changes.dependencies.map((dependency) => formatDependencyChange(dependency));

    if (changes.transitiveCount > 0) {
        bullets.push(
            `* **${PNPM_LOCKFILE}:** ${String(changes.transitiveCount)} more ${changes.transitiveCount === 1 ? "dependency" : "dependencies"} updated`,
        );
    }

    return [...bullets, ...changes.files.map((file) => `* **${file}** changed`)];
};

/**
 * Turn the changed root files into a package's root file changes, according to the scope.
 * @param changedFiles The configured root files that changed since the package's last release.
 * @param scope "affected" analyzes the pnpm lock file; any other root file, or scope "all", affects every package.
 * @param getLockfileChanges Compares the package's dependency graph in the lock file.
 * @returns The root file changes, or undefined if none trigger a release.
 */
const resolveRootFileChanges = async (
    changedFiles: string[],
    scope: Flags["rootFilesScope"],
    getLockfileChanges: () => Promise<RootFileChanges | undefined>,
): Promise<RootFileChanges | undefined> => {
    if (changedFiles.length === 0) {
        return undefined;
    }

    if (scope !== "affected") {
        return getFileChanges(changedFiles);
    }

    const files = changedFiles.filter((file) => file !== PNPM_LOCKFILE);
    const lockfileChanges = files.length < changedFiles.length ? await getLockfileChanges() : undefined;

    if (!lockfileChanges) {
        return files.length > 0 ? getFileChanges(files) : undefined;
    }

    return { ...lockfileChanges, files: [...files, ...lockfileChanges.files] };
};

/**
 * Create a detector for the root file changes that trigger a package's release.
 * All packages are compared against the commit HEAD pointed to on first use, so commits created by earlier
 * releases in the same run don't change the result. Git diffs and lock files are read once per last-release commit.
 * @param cwd The workspace root directory.
 * @param flags The multi-semantic-release options.
 * @returns A function returning a package's root file changes since its last release, or undefined if there are none.
 */
const createRootFileChangeDetector = (cwd: string, flags: Flags): ((npmPackage: Package, gitHead: string) => Promise<RootFileChanges | undefined>) => {
    const triggerRootFiles = flags.triggerRootFiles ?? [];
    const rootFilesPackages = flags.rootFilesPackages ?? [];
    const changedFilesByGitHead = new Map<string, Promise<string[]>>();
    const lockfilesByGitHead = new Map<string, Promise<PnpmLockfile | undefined>>();
    let headCommit: Promise<string> | undefined;

    const getHead = async (): Promise<string> => {
        headCommit ??= getHeadCommit(cwd);

        return await headCommit;
    };

    const readLockfile = async (gitHead: string): Promise<PnpmLockfile | undefined> =>
        await memoize(lockfilesByGitHead, gitHead, async () => await readPnpmLockfile(cwd, gitHead));

    const getLockfileChanges = async (npmPackage: Package, gitHead: string): Promise<RootFileChanges | undefined> => {
        const newLockfile = await readLockfile(await getHead());

        if (!newLockfile) {
            // The lock file was removed: treat it like any other changed root file.
            return getFileChanges([PNPM_LOCKFILE]);
        }

        const oldLockfile = await readLockfile(gitHead);

        if (!oldLockfile) {
            // Without a baseline there is nothing to compare; commit analysis decides the release.
            return undefined;
        }

        if (!isSupportedLockfile(oldLockfile) || !isSupportedLockfile(newLockfile)) {
            debug(`Unsupported ${PNPM_LOCKFILE} version, treating it as a changed root file`);

            return getFileChanges([PNPM_LOCKFILE]);
        }

        const changes = compareDependencyGraphs(oldLockfile, newLockfile, relative(cwd, npmPackage.dir) || ROOT_IMPORTER);

        return changes ? { ...changes, files: [] } : undefined;
    };

    return async (npmPackage: Package, gitHead: string): Promise<RootFileChanges | undefined> => {
        if (triggerRootFiles.length === 0 || (rootFilesPackages.length > 0 && !rootFilesPackages.includes(npmPackage.name))) {
            return undefined;
        }

        const head = await getHead();
        const changedFiles = await memoize(changedFilesByGitHead, gitHead, async () => await getChangedFiles(cwd, triggerRootFiles, gitHead, head));

        return await resolveRootFileChanges(changedFiles, flags.rootFilesScope, async () => await getLockfileChanges(npmPackage, gitHead));
    };
};

export { createRootFileChangeDetector, formatRootFileChanges };

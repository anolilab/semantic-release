import type { DependencyVersionChange, Flags, Package, RootFileChanges } from "../types";
import type { PnpmLockfile } from "./detect-root-file-changes";
import { compareDependencyGraphs, getChangedRootFiles, getHeadCommit, getImporterPath, isPnpmLockfile, readPnpmLockfile } from "./detect-root-file-changes";

const PNPM_LOCKFILE = "pnpm-lock.yaml";

const memoize = <T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> => {
    let value = cache.get(key);

    if (!value) {
        value = load();
        cache.set(key, value);
    }

    return value;
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
    getLockfileChanges: () => Promise<RootFileChanges | null>,
): Promise<RootFileChanges | undefined> => {
    if (changedFiles.length === 0) {
        return undefined;
    }

    if (scope !== "affected") {
        return { dependencies: [], files: changedFiles, releaseType: "patch", transitiveCount: 0 };
    }

    const files = changedFiles.filter((file) => !isPnpmLockfile(file));
    const lockfileChanges = files.length < changedFiles.length ? await getLockfileChanges() : null;

    if (!lockfileChanges) {
        return files.length > 0 ? { dependencies: [], files, releaseType: "patch", transitiveCount: 0 } : undefined;
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
    const lockfilesByGitHead = new Map<string, Promise<PnpmLockfile | null>>();
    let headCommit: Promise<string> | undefined;

    const getHead = async (): Promise<string> => {
        headCommit ??= getHeadCommit(cwd);

        return await headCommit;
    };

    const readLockfile = async (gitHead: string): Promise<PnpmLockfile | null> =>
        await memoize(lockfilesByGitHead, gitHead, async () => await readPnpmLockfile(cwd, gitHead));

    const getLockfileChanges = async (npmPackage: Package, gitHead: string): Promise<RootFileChanges | null> => {
        const newLockfile = await readLockfile(await getHead());

        if (!newLockfile) {
            // The lock file was removed: treat it like any other changed root file.
            return { dependencies: [], files: [PNPM_LOCKFILE], releaseType: "patch", transitiveCount: 0 };
        }

        return compareDependencyGraphs(await readLockfile(gitHead), newLockfile, getImporterPath(cwd, npmPackage.dir));
    };

    return async (npmPackage: Package, gitHead: string): Promise<RootFileChanges | undefined> => {
        if (triggerRootFiles.length === 0 || (rootFilesPackages.length > 0 && !rootFilesPackages.includes(npmPackage.name))) {
            return undefined;
        }

        const head = await getHead();
        const changedFiles = await memoize(changedFilesByGitHead, gitHead, async () => await getChangedRootFiles(cwd, triggerRootFiles, gitHead, head));

        return await resolveRootFileChanges(changedFiles, flags.rootFilesScope, async () => await getLockfileChanges(npmPackage, gitHead));
    };
};

export { formatRootFileChanges };
export default createRootFileChangeDetector;

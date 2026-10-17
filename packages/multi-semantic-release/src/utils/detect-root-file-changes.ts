import { join, relative } from "@visulima/path";
import semver from "semver";
import { parseAllDocuments } from "yaml";

import logger from "../logger";
import type { DependencyVersionChange, RootFileChanges } from "../types";

const { debug } = logger.withScope("msr:rootFileChanges");

const PNPM_LOCKFILE = "pnpm-lock.yaml";

const LINK_PREFIX = "link:";

const ROOT_IMPORTER = ".";

const HEAD = "HEAD";

// pnpm 9 and later write lock file version 9; older versions keep transitive dependencies elsewhere
const SUPPORTED_LOCKFILE_VERSION = "9";

const SEVERITY_ORDER = ["patch", "minor", "major"] as const;

type ReleaseLevel = (typeof SEVERITY_ORDER)[number];

type DependencyMap = Record<string, string | { version: string }>;

interface PnpmLockfile {
    importers?: Record<string, { dependencies?: DependencyMap; optionalDependencies?: DependencyMap } | undefined>;
    lockfileVersion?: number | string;
    packages?: Record<string, { resolution?: Record<string, unknown> } | undefined>;
    snapshots?: Record<string, { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> } | undefined>;
}

interface ResolvedDependency {
    /** The key in the lock file's `snapshots`. */
    key: string;
    /** The real package name, which differs from the dependency name for npm aliases. */
    packageName: string;
    /** The resolved version without peer and patch suffixes. */
    version: string;
}

interface DependencyEdge {
    /** The real package name of the target, or the dependency name of a workspace link. */
    packageName: string;
    /** The importer path or snapshot key the edge starts from. */
    source: string;
}

interface DependencyGraph {
    /** Direct registry dependencies of the importer and of the workspace packages it links, by name; the importer's own win. */
    direct: Map<string, ResolvedDependency>;
    /** Production dependency edges of importers and snapshots, as `source > name > target`. */
    edges: Map<string, DependencyEdge>;
    /** Every resolved registry package reachable from the importer, with its resolution. */
    nodes: Map<string, string>;
    /** The importer paths and snapshot keys in the graph. */
    sources: Set<string>;
}

/**
 * Resolve HEAD to a commit, so all packages compare against the same commit even if earlier releases add commits.
 * @param cwd The workspace root directory.
 * @returns The commit SHA of HEAD.
 */
const getHeadCommit = async (cwd: string): Promise<string> => {
    // eslint-disable-next-line e18e/ban-dependencies
    const { execa } = await import("execa");
    const result = await execa("git", ["rev-parse", HEAD], { cwd });

    return result.stdout.trim();
};

/**
 * List the given root files that changed between two commits, relative to `cwd`.
 * Fails instead of reporting no changes, so an unavailable commit (e.g. in a shallow clone) can't silently skip releases.
 * @param cwd The workspace root directory.
 * @param files The root files to check.
 * @param fromGitHead The commit of the package's last release.
 * @param toGitHead The commit to compare it with.
 * @returns The subset of `files` that differ between both commits.
 */
const getChangedRootFiles = async (cwd: string, files: string[], fromGitHead: string, toGitHead: string = HEAD): Promise<string[]> => {
    // eslint-disable-next-line e18e/ban-dependencies
    const { execa } = await import("execa");
    const result = await execa("git", ["diff", "--name-only", "--relative", fromGitHead, toGitHead, "--", ...files], { cwd, reject: false });

    if (result.exitCode !== 0) {
        throw new Error(`Cannot diff root files between ${fromGitHead} and ${toGitHead}: ${result.stderr}`);
    }

    return result.stdout.split("\n").filter(Boolean);
};

/**
 * Parse a pnpm lock file. pnpm may prepend a document describing its own installation,
 * so the last document that has importers is the workspace lock file.
 * @param content The lock file content.
 * @returns The parsed lock file or null if it has no importers.
 */
const parsePnpmLockfile = (content: string): PnpmLockfile | null => {
    const parsed = parseAllDocuments(content);
    const documents = Array.isArray(parsed) ? parsed : [parsed];
    const parseError = documents.flatMap((document) => document.errors)[0];

    if (parseError) {
        throw new Error(`Cannot parse ${PNPM_LOCKFILE}: ${parseError.message}`);
    }

    const lockfiles = documents
        .map((document) => document.toJS() as PnpmLockfile | null)
        .filter((lockfile): lockfile is PnpmLockfile => Boolean(lockfile?.importers));

    return lockfiles.at(-1) ?? null;
};

/**
 * Read the pnpm lock file of a commit.
 * @param cwd The workspace root directory.
 * @param gitHead The commit to read from.
 * @returns The parsed lock file, or null if the commit has no lock file.
 */
const readPnpmLockfile = async (cwd: string, gitHead: string = HEAD): Promise<PnpmLockfile | null> => {
    // eslint-disable-next-line e18e/ban-dependencies
    const { execa } = await import("execa");
    const result = await execa("git", ["show", `${gitHead}:./${PNPM_LOCKFILE}`], { cwd, reject: false });

    if (result.exitCode === 0) {
        return parsePnpmLockfile(result.stdout);
    }

    const commit = await execa("git", ["cat-file", "-e", gitHead], { cwd, reject: false });

    if (commit.exitCode !== 0) {
        throw new Error(`Cannot read ${PNPM_LOCKFILE} at ${gitHead}: the commit is not available (shallow clone?)`);
    }

    debug(`No ${PNPM_LOCKFILE} at ${gitHead}`);

    return null;
};

const getVersion = (entry: string | { version: string }): string => (typeof entry === "string" ? entry : entry.version);

/**
 * Drop the peer and patch suffixes, e.g. `1.0.0(react@19.0.0)` → `1.0.0`.
 * @param version A version or snapshot key from the lock file.
 * @returns The version or key without suffixes.
 */
const stripSuffix = (version: string): string => {
    const suffixStart = version.indexOf("(", 1);

    return suffixStart === -1 ? version : version.slice(0, suffixStart);
};

/**
 * Get the package name of a snapshot key, e.g. `@scope/name@1.0.0(peer@2.0.0)` → `@scope/name`.
 * @param snapshotKey A key of the lock file's `snapshots`.
 * @returns The name without version and suffixes.
 */
const getPackageName = (snapshotKey: string): string => {
    const key = stripSuffix(snapshotKey);
    const versionStart = key.indexOf("@", 1);

    return versionStart === -1 ? key : key.slice(0, versionStart);
};

/**
 * Resolve a dependency to its snapshot key. Aliased dependencies carry the real package in their version.
 * @param lockfile The parsed lock file.
 * @param name The dependency name.
 * @param version The resolved version from the lock file.
 * @returns The key of the dependency in the lock file's `snapshots`.
 */
const getSnapshotKey = (lockfile: PnpmLockfile, name: string, version: string): string => {
    const key = `${name}@${version}`;

    return Object.hasOwn(lockfile.snapshots ?? {}, key) || Object.hasOwn(lockfile.packages ?? {}, key) ? key : version;
};

/**
 * Resolve a dependency to its snapshot key, real package name and version.
 * @param lockfile The parsed lock file.
 * @param name The name the manifest declares the dependency under.
 * @param version The resolved version from the lock file, e.g. `real-package@1.0.0` for npm aliases.
 * @returns The snapshot key, the real package name and the version without suffixes.
 */
const resolveDependency = (lockfile: PnpmLockfile, name: string, version: string): ResolvedDependency => {
    const key = getSnapshotKey(lockfile, name, version);

    if (key !== version) {
        return { key, packageName: name, version: stripSuffix(version) };
    }

    const packageName = getPackageName(version);

    return { key, packageName, version: stripSuffix(version).slice(packageName.length + 1) };
};

/**
 * Describe how a snapshot was resolved, so a republished or patched version counts as a change.
 * @param lockfile The parsed lock file.
 * @param snapshotKey The snapshot key, including its peer and patch suffixes.
 * @returns The resolution as a string.
 */
const getResolution = (lockfile: PnpmLockfile, snapshotKey: string): string => JSON.stringify(lockfile.packages?.[stripSuffix(snapshotKey)]?.resolution ?? {});

/**
 * Collect every snapshot reachable from the given ones through dependencies and optionalDependencies.
 * @param lockfile The parsed lock file.
 * @param roots The snapshot keys to start from.
 * @param edges The dependency edges, extended in place by those between snapshots.
 * @returns The reachable snapshot keys with their resolution.
 */
const collectReachableSnapshots = (lockfile: PnpmLockfile, roots: string[], edges: Map<string, DependencyEdge>): Map<string, string> => {
    const nodes = new Map<string, string>();
    const pending = [...roots];

    while (pending.length > 0) {
        const key = pending.pop() as string;

        if (!nodes.has(key)) {
            nodes.set(key, getResolution(lockfile, key));

            const snapshot = lockfile.snapshots?.[key];
            const entries = Object.entries({ ...snapshot?.dependencies, ...snapshot?.optionalDependencies }).filter(
                ([, version]) => !version.startsWith(LINK_PREFIX),
            );

            for (const [name, version] of entries) {
                const target = getSnapshotKey(lockfile, name, version);

                // A dependency resolved to another snapshot is a change even if both snapshots stay in the graph.
                edges.set(`${key} > ${name} > ${target}`, { packageName: getPackageName(target), source: key });
                pending.push(target);
            }
        }
    }

    return nodes;
};

interface ImporterWalk {
    direct: Map<string, ResolvedDependency>;
    edges: Map<string, DependencyEdge>;
    pendingImporters: string[];
    roots: string[];
}

/**
 * Record the production dependencies of one importer and queue the workspace packages it links.
 * @param lockfile The parsed lock file.
 * @param path The importer key in the lock file, relative to the workspace root.
 * @param walk The state of the walk, updated in place.
 */
const visitImporter = (lockfile: PnpmLockfile, path: string, walk: ImporterWalk): void => {
    const importer = lockfile.importers?.[path];
    const entries = Object.entries({ ...importer?.dependencies, ...importer?.optionalDependencies });

    for (const [name, entry] of entries) {
        const version = getVersion(entry);

        if (version.startsWith(LINK_PREFIX)) {
            const target = join(path, version.slice(LINK_PREFIX.length)) || ROOT_IMPORTER;

            walk.edges.set(`${path} > ${name} > ${target}`, { packageName: name, source: path });
            walk.pendingImporters.push(target);
        } else {
            const dependency = resolveDependency(lockfile, name, version);

            // A linked package may resolve a dependency the importer has too: both stay in the graph,
            // the importer's own resolution is reported.
            walk.edges.set(`${path} > ${name} > ${dependency.key}`, { packageName: dependency.packageName, source: path });
            walk.roots.push(dependency.key);

            if (!walk.direct.has(name)) {
                walk.direct.set(name, dependency);
            }
        }
    }
};

/**
 * Collect the production dependency graph of an importer: dependencies and optionalDependencies,
 * transitively, following workspace links into the production dependencies of linked packages.
 * @param lockfile The parsed lock file.
 * @param importerPath The importer path of the package, relative to the workspace root.
 * @returns The dependency graph, or null if the lock file has no such importer.
 */
const collectDependencyGraph = (lockfile: PnpmLockfile, importerPath: string): DependencyGraph | null => {
    if (!Object.hasOwn(lockfile.importers ?? {}, importerPath)) {
        return null;
    }

    // Breadth-first, so the importer's own dependencies are recorded before those of linked packages.
    const walk: ImporterWalk = { direct: new Map(), edges: new Map(), pendingImporters: [importerPath], roots: [] };
    const visitedImporters = new Set<string>();

    while (walk.pendingImporters.length > 0) {
        const path = walk.pendingImporters.shift() as string;

        if (!visitedImporters.has(path)) {
            visitedImporters.add(path);
            visitImporter(lockfile, path, walk);
        }
    }

    const nodes = collectReachableSnapshots(lockfile, walk.roots, walk.edges);

    return { direct: walk.direct, edges: walk.edges, nodes, sources: new Set([...visitedImporters, ...nodes.keys()]) };
};

/**
 * Determine the release level of a version change.
 * @param oldVersion The previously resolved version.
 * @param newVersion The newly resolved version.
 * @returns The release level, patch when the versions can't be compared.
 */
const getReleaseLevel = (oldVersion: string, newVersion: string): ReleaseLevel => {
    const oldClean = semver.coerce(oldVersion);
    const newClean = semver.coerce(newVersion);

    if (!oldClean || !newClean) {
        return "patch";
    }

    if (oldClean.major !== newClean.major) {
        return "major";
    }

    return oldClean.minor === newClean.minor ? "patch" : "minor";
};

/**
 * List the direct dependencies that were added, removed or resolved to another version.
 * @param oldDirect The direct dependencies at the last release.
 * @param newDirect The current direct dependencies.
 * @returns The changes, sorted by name, and the highest semver change among the updated ones.
 */
const getDirectChanges = (
    oldDirect: Map<string, ResolvedDependency>,
    newDirect: Map<string, ResolvedDependency>,
): { dependencies: DependencyVersionChange[]; releaseType: ReleaseLevel } => {
    const names = [...new Set([...oldDirect.keys(), ...newDirect.keys()])].toSorted((a, b) => a.localeCompare(b));
    const dependencies: DependencyVersionChange[] = names
        .map((name) => {
            return { name, newVersion: newDirect.get(name)?.version, oldVersion: oldDirect.get(name)?.version };
        })
        .filter(({ newVersion, oldVersion }) => oldVersion !== newVersion);
    const levels = dependencies.map(({ newVersion, oldVersion }) => (oldVersion && newVersion ? getReleaseLevel(oldVersion, newVersion) : "patch"));
    const releaseType = SEVERITY_ORDER[Math.max(0, ...levels.map((level) => SEVERITY_ORDER.indexOf(level)))] as ReleaseLevel;

    return { dependencies, releaseType };
};

/**
 * List the targets of edges that were added or removed between two importers or snapshots present in both graphs.
 * An edge whose source was added or removed is already covered by that change.
 * @param oldGraph The dependency graph at the last release.
 * @param newGraph The current dependency graph.
 * @returns The package names of the changed edges' targets.
 */
const getChangedEdgeNames = (oldGraph: DependencyGraph, newGraph: DependencyGraph): string[] =>
    [...new Map([...oldGraph.edges, ...newGraph.edges])]
        .filter(([key, { source }]) => oldGraph.sources.has(source) && newGraph.sources.has(source) && !(oldGraph.edges.has(key) && newGraph.edges.has(key)))
        .map(([, { packageName }]) => packageName);

const isSupportedLockfile = (lockfile: PnpmLockfile): boolean => String(lockfile.lockfileVersion).startsWith(SUPPORTED_LOCKFILE_VERSION);

/**
 * Compare the production dependency graph of a package between two lock files.
 * @param oldLockfile The lock file at the package's last release.
 * @param newLockfile The current lock file.
 * @param importerPath The importer path of the package.
 * @returns The changes, or null if the graph is unchanged or either lock file lacks the package.
 */
const compareDependencyGraphs = (oldLockfile: PnpmLockfile | null, newLockfile: PnpmLockfile, importerPath: string): RootFileChanges | null => {
    if (oldLockfile && (!isSupportedLockfile(oldLockfile) || !isSupportedLockfile(newLockfile))) {
        debug(`Unsupported ${PNPM_LOCKFILE} version, treating it as a changed root file`);

        return { dependencies: [], files: [PNPM_LOCKFILE], releaseType: "patch", transitiveCount: 0 };
    }

    const newGraph = collectDependencyGraph(newLockfile, importerPath);
    // Without a baseline (no lock file or no importer at the last release) there is nothing to compare;
    // commit analysis decides the release, as catalog detection does without old catalogs.
    const oldGraph = oldLockfile ? collectDependencyGraph(oldLockfile, importerPath) : null;

    if (!newGraph || !oldGraph) {
        return null;
    }

    const changedNodes = [...new Set([...oldGraph.nodes.keys(), ...newGraph.nodes.keys()])].filter(
        (key) => oldGraph.nodes.get(key) !== newGraph.nodes.get(key),
    );
    const changedEdgeNames = getChangedEdgeNames(oldGraph, newGraph);
    const { dependencies, releaseType } = getDirectChanges(oldGraph.direct, newGraph.direct);

    if (changedNodes.length === 0 && changedEdgeNames.length === 0 && dependencies.length === 0) {
        return null;
    }

    // Packages reported as direct changes, by their real name (npm aliases), don't count as further updates.
    const reported = new Set(dependencies.flatMap(({ name }) => [name, oldGraph.direct.get(name)?.packageName, newGraph.direct.get(name)?.packageName]));
    const furtherNames = new Set([...changedNodes.map((key) => getPackageName(key)), ...changedEdgeNames]);

    return {
        dependencies,
        files: [],
        releaseType,
        transitiveCount: [...furtherNames].filter((name) => !reported.has(name)).length,
    };
};

/**
 * Get the importer path of a package directory in the pnpm lock file.
 * @param cwd The workspace root directory.
 * @param directory The package directory.
 * @returns The directory relative to `cwd`, or "." for the workspace root.
 */
const getImporterPath = (cwd: string, directory: string): string => relative(cwd, directory) || ROOT_IMPORTER;

const isPnpmLockfile = (file: string): boolean => file === PNPM_LOCKFILE;

export { compareDependencyGraphs, getChangedRootFiles, getHeadCommit, getImporterPath, isPnpmLockfile, readPnpmLockfile };
export type { PnpmLockfile };

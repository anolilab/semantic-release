// Type definitions for multi-semantic-release

import type { Writable } from "node:stream";

import type { ReleaseType } from "semver";

import type { ReleaseLevel } from "./utils/release-type";

// Package manifest interface (package.json contents)
export interface PackageManifest {
    [key: string]: unknown;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    name: string;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    private?: boolean;
    version: string;
}

// Commit interface for git log parsing
export interface Commit {
    [key: string]: unknown;
    committerDate: Date;
    gitTags: string;
    hash: string;
    message: string;
    subject: string;
}

// A changed catalog entry that a package depends on
export interface PackageCatalogChange {
    catalogName: string;
    dependencyName: string;
    newVersion: string;
    oldVersion: string;
    releaseType: ReleaseLevel;
}

// A direct dependency that was added, removed or resolved to another version in the lock file
export interface DependencyVersionChange {
    name: string;
    // Undefined if the dependency was removed
    newVersion?: string;
    // Undefined if the dependency was added
    oldVersion?: string;
    // The semver change; "patch" for added, removed or non-semver dependencies
    releaseType: ReleaseLevel;
}

// Root file changes that trigger a release of a package
export interface RootFileChanges {
    // Direct dependencies whose resolved version changed (scope "affected", pnpm lock file)
    dependencies: DependencyVersionChange[];
    // Changed root files that trigger the release as a whole
    files: string[];
    releaseType: ReleaseLevel;
    // Number of other packages in the dependency graph whose resolution changed (transitive or peer context)
    transitiveCount: number;
}

// Package object representing a package in the monorepo
export interface Package {
    _analyzed?: boolean;
    _branch?: string;
    _catalogChanges?: PackageCatalogChange[];
    _depsUpdated?: boolean;
    _lastRelease?: Release;
    _nextRelease?: Release;
    _nextType?: ReleaseType | null;
    _prepared?: boolean;
    _preRelease?: string | null;
    _published?: boolean;

    // Runtime state properties (set during execution)
    _ready?: boolean;
    _rootFileChanges?: RootFileChanges;
    deps: string[];
    dir: string;
    localDeps: Package[];
    manifest: PackageManifest;
    name: string;
    options: Record<string, unknown>;
    path: string;
    plugins: PluginFunctions;
    result?: ReleaseResult | false;
}

// Release information
export interface Release {
    [key: string]: unknown;
    channel?: string;
    gitHead?: string;
    gitTag?: string;
    notes?: string;
    version: string;
}

// Release result from semantic-release
export interface ReleaseResult {
    [key: string]: unknown;
    commits?: Commit[];
    lastRelease?: Release;
    nextRelease?: Release;
    releases?: Release[];
}

// Plugin functions interface (matches semantic-release plugin structure)
export interface PluginFunctions {
    analyzeCommits?: (context: SemanticReleaseContext) => Promise<string | null | undefined>;
    generateNotes?: (context: SemanticReleaseContext) => Promise<string>;
    prepare?: (context: SemanticReleaseContext) => Promise<void>;
    publish?: (context: SemanticReleaseContext) => Promise<unknown>;
    verifyConditions?: (context: SemanticReleaseContext) => Promise<void>;
    verifyRelease?: (context: SemanticReleaseContext) => Promise<void>;
}

// Semantic Release context
export interface SemanticReleaseContext {
    [key: string]: unknown;
    branch?: Branch;
    commits?: Commit[];
    cwd: string;
    env: Record<string, string>;
    lastRelease?: Release;
    logger?: Record<string, unknown>;
    nextRelease?: Release;
    options: Record<string, unknown> & { _pkgOptions?: Record<string, unknown> };
    stderr: Writable;
    stdout: Writable;
}

// Branch information
export interface Branch {
    [key: string]: unknown;
    name: string;
    prerelease?: string | null;
}

// Multi-release context
export interface MultiContext {
    cwd: string;
    env: NodeJS.ProcessEnv;
    globalOptions: Record<string, unknown>;
    inputOptions: Record<string, unknown>;
    stderr: NodeJS.WriteStream;
    stdout: NodeJS.WriteStream;
}

export type ReleaseStrategy = "patch" | "minor" | "major" | "inherit";

// Root files whose changes trigger releases, e.g. pnpm-lock.yaml
export interface RootFilesConfig {
    // Root files (relative to the workspace root) whose changes trigger releases
    files?: string[];
    // Names of the packages root file changes apply to; empty applies them to all packages
    packages?: string[];
    // Release type when a root file triggers a release
    release?: ReleaseStrategy;
    // "all" releases every package when a root file changes, "affected" only packages whose
    // production dependencies changed in pnpm-lock.yaml (other root files behave as with "all")
    scope?: "all" | "affected";
}
// Configuration interfaces
export interface MultiReleaseConfig {
    [key: string]: unknown;
    branches?: string[] | string;
    ci?: boolean;
    debug?: boolean;
    deps?: {
        bump?: "override" | "satisfy" | "inherit";
        prefix?: string;
        release?:
            | ReleaseStrategy
            | {
                  major?: Exclude<ReleaseStrategy, "inherit">;
                  minor?: Exclude<ReleaseStrategy, "inherit">;
                  patch?: Exclude<ReleaseStrategy, "inherit">;
              };
    };
    dryRun?: boolean;
    firstParent?: boolean;
    ignorePackages?: string[];
    ignorePrivate?: boolean;
    rootFiles?: RootFilesConfig;
    /** @deprecated Use `rootFiles.packages`. */
    rootFilesPackages?: string[];
    /** @deprecated Use `rootFiles.release`. */
    rootFilesReleaseType?: ReleaseStrategy;
    /** @deprecated Use `rootFiles.scope`. */
    rootFilesScope?: "all" | "affected";
    sequentialInit?: boolean;
    sequentialPrepare?: boolean;
    silent?: boolean;
    tagFormat?: string;
    /** @deprecated Use `rootFiles.files`. */
    triggerRootFiles?: string[];
}

// Global options (from root package.json)
export interface GlobalOptions {
    [key: string]: unknown;
}

// Package-specific options (from individual package.json)
export interface PackageOptions {
    [key: string]: unknown;
}

// Input options passed to multiSemanticRelease
export interface InputOptions {
    [key: string]: unknown;
}

// Flags passed from CLI
export interface Flags extends MultiReleaseConfig {
    [key: string]: unknown;
    logLevel?: string;
}

// Error class for validation errors
export class ValueError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "ValueError";
    }
}

// Stream buffer interface
export interface WritableStreamBuffer {
    [key: string]: unknown;
    write: (message: string) => void;
}

// Function type definitions for utility functions
export type CheckFunction = (value: unknown, message?: string) => void | never;

export type GetCommitsFilteredFunction = (
    cwd: string,
    direction: string,
    lastRelease?: string,
    nextRelease?: string,
    firstParentBranch?: string,
) => Promise<Commit[]>;

export type GetManifestFunction = (path: string) => PackageManifest;

export type CleanPathFunction = (path: string, cwd?: string) => string;

export type StreamToArrayFunction = (stream: NodeJS.ReadableStream) => Promise<unknown[]>;

export type GetVersionFunction = (package_: Package) => string | undefined;

export type GetNextPreVersionFunction = (package_: Package) => string | undefined;

export type ResolveReleaseTypeFunction = (
    package_: Package,
    bumpStrategy?: string,
    releaseStrategy?: string,
    ignore?: Package[],
    prefix?: string,
) => string | undefined;

// eslint-disable-next-line unicorn/name-replacements
export type UpdateManifestDepsFunction = (package_: Package) => void;

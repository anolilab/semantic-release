// Type definitions for multi-semantic-release

import type { Writable } from "node:stream";

import type { ReleaseType } from "semver";

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

// Package object representing a package in the monorepo
export interface Package {
    _analyzed?: boolean;
    _branch?: string;
    _depsUpdated?: boolean;
    _lastRelease?: Release;
    _nextRelease?: Release;
    _nextType?: ReleaseType | null;
    _prepared?: boolean;
    _preRelease?: string | null;
    _published?: boolean;

    // Runtime state properties (set during execution)
    _ready?: boolean;
    deps: string[];
    dir: string;
    fakeLogger: { error: () => void; log: () => void };
    localDeps: Package[];
    manifest: PackageManifest;
    name: string;
    options: Record<string, unknown>;
    path: string;
    plugins: PluginFunctions;
    result?: ReleaseResult | false | undefined;
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
    analyzeCommits?: (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext) => Promise<string | null | undefined>;
    generateNotes?: (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext) => Promise<string>;
    prepare?: (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext) => Promise<void>;
    publish?: (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext) => Promise<unknown>;
    verifyConditions?: (pluginOptions: Record<string, unknown>, context: SemanticReleaseContext) => Promise<void>;
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

// Configuration interfaces
export interface MultiReleaseConfig {
    [key: string]: unknown;
    branches?: string[] | string;
    ci?: boolean;
    debug?: boolean;
    deps?: {
        bump?: "override" | "satisfy" | "inherit";
        prefix?: string;
        release?: "patch" | "minor" | "major" | "inherit";
    };
    dryRun?: boolean;
    firstParent?: boolean;
    ignorePackages?: string[];
    ignorePrivate?: boolean;
    sequentialInit?: boolean;
    sequentialPrepare?: boolean;
    silent?: boolean;
    tagFormat?: string;
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

// File format information
export interface FileFormat {
    indent: string | number;
    trailingWhitespace: string;
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

export type RecognizeFormatFunction = (contents: string) => FileFormat;

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

export type UpdateManifestDepsFunction = (package_: Package) => void;

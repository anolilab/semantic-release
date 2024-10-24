import type stream from "node:stream";
import type { Options, Commit } from "./semantic-release";

// @todo these types need testing

/**
 * Define context types. Documentation seems to not be up to date with the
 * source code.
 *
 * Source: https://github.com/semantic-release/semantic-release/blob/master/index.js
 * Docs: https://semantic-release.gitbook.io/semantic-release/developer-guide/plugin#context
 */
export interface CommonContext {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L66
    branch: BranchSpec;
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L65
    branches: BranchSpec[];
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L256-L260
    cwd: string;
    env: typeof process.env;
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L262
    logger: {
        // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/lib/get-logger.js#L12-L14
        error: (...message: string[]) => void;
        log: (...message: string[]) => void;
        success: (...message: string[]) => void;
    };
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L267
    options: Options;
    stderr: stream.Writable;
    stdout: stream.Writable;
}

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L103
export type VerifyConditionsContext = CommonContext;

type CommonContext2 = CommonContext & {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L106
    releases: Release[];
};

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L118
type GenerateNotesContext1 = CommonContext2 & {
    commits: Commit[];
    lastRelease: Release;
    nextRelease: Release;
};

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L140
export type AddChannelContext = CommonContext2 & {
    commits: Commit[];
    currentRelease: Release;
    lastRelease: Release;
    nextRelease: Release;
};

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L142
type SuccessContext1 = CommonContext2 & {
    commits: Commit[];
    lastRelease: Release;
    nextRelease: Release;
};

type CommonContext3 = CommonContext2 & {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L163
    commits: Commit[];

    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#LL150C3-L150C10
    lastRelease: Release;
};

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L166
export type AnalyzeCommitsContext = CommonContext3;

type CommonContext4 = CommonContext3 & {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L163
    commits: Commit[];

    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L175
    nextRelease: Release;
};

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L189
export type VerifyReleaseContext = CommonContext4;

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L191
type GenerateNotesContext2 = CommonContext4;

export type GenerateNotesContext = GenerateNotesContext1 | GenerateNotesContext2;

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L193
export type PrepareContext = CommonContext4;

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L206
export type PublishContext = CommonContext4;

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L209
type SuccessContext2 = CommonContext4;

export type SuccessContext = SuccessContext1 | SuccessContext2;

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L243
export type FailContext = CommonContext & {
    errors: unknown[];
};

// @todo infer return type from https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/lib/branches/index.js#L70
export interface BranchSpec {
    name: string;
    tags?: Tag[];
}

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L133
export interface Tag {
    channel?: string;
    gitHead?: string;
    gitTag?: string;
    version?: string;
}

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/lib/get-release-to-add.js#LL51C9-L56C25
export interface Release {
    channel?: string | null;
    gitHead?: string;
    gitTag?: string;
    name?: string;
    // https://github.com/sindresorhus/semver-diff#semverdiffversiona-versionb
    type?: "build" | "major" | "minor" | "patch" | "premajor" | "preminor" | "prepatch" | "prerelease" | undefined;
    version: string;
}

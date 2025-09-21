/* eslint-disable no-secrets/no-secrets */
import type stream from "node:stream";

import type { Commit, Options } from "./semantic-release";

// @todo these types need testing

type CommonContext2 = CommonContext & {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L106
    releases: Release[];
};

type CommonContext3 = CommonContext2 & {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L163
    commits: Commit[];

    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#LL150C3-L150C10
    lastRelease: Release;
};

type CommonContext4 = CommonContext3 & {
    // https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L175
    nextRelease: Release;
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

// https://github.com/semantic-release/semantic-release/blob/27b105337b16dfdffb0dfa36d1178015e7ba68a3/index.js#L206
// eslint-disable-next-line sonarjs/redundant-type-aliases
export type PublishContext = CommonContext4;

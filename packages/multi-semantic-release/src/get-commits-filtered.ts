// eslint-disable-next-line simple-import-sort/imports
import { existsSync, lstatSync } from "node:fs";
import { relative } from "node:path";

import { execa } from "execa";
import gitLogParser from "git-log-parser";

import logger from "./logger";
import { validate } from "./utils/validate";
import cleanPath from "./utils/clean-path";
import streamToArray from "./utils/stream-to-array";
import type { Commit } from "./types";

const { debug } = logger.withScope("msr:commitsFilter");

/**
 * Retrieve the list of commits on the current branch since the commit sha associated with the last release, or all the commits of the current branch if there is no last released version.
 * Commits are filtered to only return those that corresponding to the package directory.
 * @param cwd Absolute path of the working directory the Git repo is in.
 * @param direction Path to the target directory to filter by. Either absolute, or relative to cwd param.
 * @param lastRelease The SHA of the previous release (default to start of all commits if undefined)
 * @param nextRelease The SHA of the next release (default to HEAD if undefined)
 * @param firstParentBranch first-parent to determine which merges went into master
 * @returns The list of commits on the branch `branch` since the last release.
 */
const getCommitsFiltered = async (
    cwd: string,
    direction: string,
    lastRelease?: string,
    nextRelease?: string,
    firstParentBranch?: string,
): Promise<Commit[]> => {
    validate(cwd, "cwd: directory");
    // eslint-disable-next-line no-param-reassign
    cwd = cleanPath(cwd);

    validate(direction, "dir: path");
    // eslint-disable-next-line no-param-reassign
    direction = cleanPath(direction, cwd);

    if (!existsSync(direction) || !lstatSync(direction).isDirectory()) {
        throw new TypeError("dir: Must be a path to an existing directory");
    }

    validate(lastRelease, "lastRelease: alphanumeric{40}?");
    validate(nextRelease, "nextRelease: alphanumeric{40}?");

    if (direction.indexOf(cwd) !== 0) {
        throw new TypeError("dir: Must be inside cwd");
    }

    if (direction === cwd) {
        throw new TypeError("dir: Must not be equal to cwd");
    }

    const root = await execa("git", ["rev-parse", "--show-toplevel"], { cwd });
    const gitRoot = cleanPath(root.stdout);

    Object.assign(gitLogParser.fields, {
        committerDate: { key: "ci", type: Date },
        gitTags: "d",
        hash: "H",
        message: "B",
    });

    const relpath = relative(gitRoot, direction);
    const firstParentBranchFilter = firstParentBranch ? ["--first-parent", firstParentBranch] : [];
    const range = (lastRelease ? `${lastRelease}..` : "") + (nextRelease || "HEAD");
    const gitLogFilterQuery = [...firstParentBranchFilter, range, "--", relpath];
    const stream = gitLogParser.parse({ _: gitLogFilterQuery }, { cwd: gitRoot, env: process.env });

    const commits = (await streamToArray(stream)) as Commit[];

    commits.forEach((commit: Commit) => {
        // eslint-disable-next-line no-param-reassign
        commit.message = commit.message.trim();
        // eslint-disable-next-line no-param-reassign
        commit.gitTags = commit.gitTags.trim();
    });

    debug("git log filter query: %o", gitLogFilterQuery);
    debug("filtered commits: %O", commits);

    return commits;
};

export default getCommitsFiltered;

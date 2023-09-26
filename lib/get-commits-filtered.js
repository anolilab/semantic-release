import { relative } from "node:path";

import { execa } from "execa";
import gitLogParser from "git-log-parser";

import { logger } from "./logger.js";
import { check,ValueError } from "./utils/blork.js";
import cleanPath from "./utils/clean-path.js";
import streamToArray from "./utils/stream-to-array.js";

const { debug } = logger.withScope("msr:commitsFilter");

/**
 * Retrieve the list of commits on the current branch since the commit sha associated with the last release, or all the commits of the current branch if there is no last released version.
 * Commits are filtered to only return those that corresponding to the package directory.
 *
 * This is achieved by using "-- my/dir/path" with `git log` — passing this into gitLogParser() with
 *
 * @param {string} cwd Absolute path of the working directory the Git repo is in.
 * @param {string} dir Path to the target directory to filter by. Either absolute, or relative to cwd param.
 * @param {string|void} lastRelease The SHA of the previous release (default to start of all commits if undefined)
 * @param {string|void} nextRelease The SHA of the next release (default to HEAD if undefined)
 * @param {string|void} firstParentBranch first-parent to determine which merges went into master
 * @return {Promise<Array<Commit>>} The list of commits on the branch `branch` since the last release.
 */
async function getCommitsFiltered(cwd, dir, lastRelease, nextRelease, firstParentBranch) {
    // Clean paths and make sure directories exist.
    check(cwd, "cwd: directory");
    check(dir, "dir: path");

    // eslint-disable-next-line no-param-reassign
    cwd = cleanPath(cwd);
    // eslint-disable-next-line no-param-reassign
    dir = cleanPath(dir, cwd);

    check(dir, "dir: directory");
    check(lastRelease, "lastRelease: alphanumeric{40}?");
    check(nextRelease, "nextRelease: alphanumeric{40}?");

    // target must be inside and different than cwd.
    if (dir.indexOf(cwd) !== 0) {
        throw new ValueError("dir: Must be inside cwd", dir);
    }

    if (dir === cwd) {
        throw new ValueError("dir: Must not be equal to cwd", dir);
    }

    // Get top-level Git directory as it might be higher up the tree than cwd.
    const root = await execa("git", ["rev-parse", "--show-toplevel"], { cwd });

    // Add correct fields to gitLogParser.
    Object.assign(gitLogParser.fields, {
        committerDate: { key: "ci", type: Date },
        gitTags: "d",
        hash: "H",
        message: "B",
    });

    // Use git-log-parser to get the commits.
    const relpath = relative(root.stdout, dir);
    const firstParentBranchFilter = firstParentBranch ? ["--first-parent", firstParentBranch] : [];
    const range = (lastRelease ? `${lastRelease}..` : "") + (nextRelease || "HEAD");
    const gitLogFilterQuery = [...firstParentBranchFilter, range, "--", relpath];
    const stream = gitLogParser.parse({ _: gitLogFilterQuery }, { cwd, env: process.env });

    const commits = await streamToArray(stream);

    // Trim message and tags.
    commits.forEach((commit) => {
        commit.message = commit.message.trim();
        commit.gitTags = commit.gitTags.trim();
    });

    debug("git log filter query: %o", gitLogFilterQuery);
    debug("filtered commits: %O", commits);

    // Return the commits.
    return commits;
}

// Exports.
export default getCommitsFiltered;

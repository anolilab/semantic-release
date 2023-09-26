/**
 * Lifted and tweaked from semantic-release because we follow how they __tests__ their internals.
 * https://github.com/semantic-release/semantic-release/blob/master/test/helpers/git-utils.js
 */

import { check } from "blork";
import { execaSync } from "execa";
import fileUrl from "file-url";
import { temporaryDirectory } from "tempy";

/**
 * Add a Git config setting.
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {string} name Config name.
 * @param {any} value Config value.
 * @returns {void}
 */
export function gitConfig(cwd, name, value) {
    check(cwd, "cwd: absolute");
    check(name, "name: string+");

    execaSync("git", ["config", "--add", name, value], { cwd });
}

/**
 * Sets git user data.
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {string} name Committer name.
 * @param {string} email Committer email.
 * @returns {void} Return void.
 */
export function gitUser(cwd, name = "Foo Bar", email = "email@foo.bar") {
    execaSync("git", ["config", "--local", "user.email", email], { cwd });
    execaSync("git", ["config", "--local", "user.name", name], { cwd });
}

/**
 * @typedef {Object} Commit
 * @property {string} branch The commit branch.
 * @property {string} hash The commit hash.
 * @property {string} message The commit message.
 */

/**
 * Create a Git repository.
 * _Created in a temp folder._
 *
 * @param {string} branch="master" The branch to initialize the repository to.
 * @return {string} String pointing to the CWD for the created Git repository.
 */
export function gitInit(branch = "master") {
    check(branch, "branch: kebab");

    // Init Git in a temp directory.
    const cwd = temporaryDirectory();

    execaSync("git", ["init"], { cwd });
    execaSync("git", ["checkout", "-b", branch], { cwd });

    // Disable GPG signing for commits.
    gitConfig(cwd, "commit.gpgsign", false);
    gitUser(cwd);

    // Return directory.
    return cwd;
}

/**
 * Create a remote Git repository.
 * _Created in a temp folder._
 *
 * @return {string} String URL of the remote origin.
 */
export function gitInitRemote() {
    // Init bare Git repository in a temp directory.
    const cwd = temporaryDirectory();

    execaSync("git", ["init", "--bare"], { cwd });

    // Turn remote path into a file URL.
    // Return URL for remote.
    return fileUrl(cwd);
}

/**
 * Get the current HEAD SHA in a local Git repository.
 *
 * @param {string} cwd The CWD of the Git repository.
 * @return {string} The SHA of the head commit.
 */
export function gitGetHead(cwd) {
    check(cwd, "cwd: absolute");

    // Await command and return HEAD SHA.
    return execaSync("git", ["rev-parse", "HEAD"], { cwd }).stdout;
}

/**
 * Create a remote Git repository and set it as the origin for a Git repository.
 * _Created in a temp folder._
 *
 * @param {string} cwd The cwd to create and set the origin for.
 * @param {string|null} releaseBranch="null" Optional branch to be added in case of prerelease is activated for a branch.
 * @return {string} String URL of the remote origin.
 */
export function gitInitOrigin(cwd, releaseBranch = null) {
    check(cwd, "cwd: absolute");

    // Turn remote path into a file URL.
    const url = gitInitRemote();

    // Set origin on local repo.
    execaSync("git", ["remote", "add", "origin", url], { cwd });

    // Set up a release branch. Return to master afterwards.
    if (releaseBranch) {
        execaSync("git", ["checkout", "-b", releaseBranch], { cwd });
        execaSync("git", ["checkout", "master"], { cwd });
    }

    execaSync("git", ["push", "--all", "origin"], { cwd });

    // Return URL for remote.
    return url;
}

/**
 * Add files to staged commit in a Git repository.
 *
 * @param {string} cwd The cwd to create and set the origin for.
 * @param {string} file="." The file to add, defaulting to "." (all files).
 * @return {void}
 */
export function gitAdd(cwd, file = ".") {
    check(cwd, "cwd: absolute");

    execaSync("git", ["add", file], { cwd });
}

/**
 * Create commit on a Git repository.
 * _Allows empty commits without any files added._
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {string} message Commit message.
 * @returns {string} Promise that resolves to the SHA for the commit.
 */
export function gitCommit(cwd, message) {
    check(cwd, "cwd: absolute");
    check(message, "message: string+");

    execaSync("git", ["commit", "-m", message, "--no-gpg-sign"], { cwd });

    // Return HEAD SHA.
    return gitGetHead(cwd);
}

/**
 * `git add .` followed by `git commit`
 * _Allows empty commits without any files added._
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {string} message Commit message.
 * @returns {string} Promise that resolves to the SHA for the commit.
 */
export function gitCommitAll(cwd, message) {
    check(cwd, "cwd: absolute");
    check(message, "message: string+");

    gitAdd(cwd);

    // return the SHA hash.
    return gitCommit(cwd, message);
}

/**
 * Push to a remote Git repository.
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {string} remote The remote repository URL or name.
 * @param {string} branch The branch to push.
 * @returns {void}
 * @throws {Error} if the push failed.
 */
export function gitPush(cwd, remote = "origin", branch = "master") {
    check(cwd, "cwd: absolute");
    check(remote, "remote: string");
    check(branch, "branch: lower");

    execaSync("git", ["push", "--tags", remote, `HEAD:${branch}`], { cwd });
}

/**
 * Create a tag on the HEAD commit in a local Git repository.
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {string} tagName The tag name to create.
 * @param {string} hash=false SHA for the commit on which to create the tag. If falsy the tag is created on the latest commit.
 * @returns {void}
 */
export function gitTag(cwd, tagName, hash = undefined) {
    check(cwd, "cwd: absolute");
    check(tagName, "tagName: string+");
    check(hash, "hash: alphanumeric{40}?");

    // Run command.
    execaSync("git", hash ? ["tag", "-f", tagName, hash] : ["tag", tagName], { cwd });
}

/**
 * Get the commit message log of given commit SHA or branch name.
 *
 * @param {string} cwd The CWD of the Git repository.
 * @param {number} number Limit the number of commits to output.
 * @param {string} hash The commit SHA or branch name.
 * @return {string} Commit log message.
 */
export function gitGetLog(cwd, number, hash) {
    check(cwd, "cwd: absolute");
    check(number, "number: integer");
    check(hash, "hash: string+");

    // Run command.
    return execaSync("git", ["log", `-${number}`, hash], { cwd }).stdout;
}

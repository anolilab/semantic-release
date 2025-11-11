/**
 * Lifted and tweaked from semantic-release because we follow how they __tests__ their internals.
 * https://github.com/semantic-release/semantic-release/blob/master/test/helpers/git-utils.js
 */

import { execaSync } from "execa";
import fileUrl from "file-url";
import { temporaryDirectory } from "tempy";

import { validate } from "../../src/utils/validate";

/**
 * Add a Git config setting.
 * @param cwd The CWD of the Git repository.
 * @param name Config name.
 * @param value Config value.
 * @returns
 */
export const gitConfig = (cwd: string, name: string, value: string): void => {
    validate(cwd, "cwd: absolute");
    validate(name, "name: string+");

    execaSync("git", ["config", "--add", name, value], { cwd });
};

/**
 * Sets git user data.
 * @param cwd The CWD of the Git repository.
 * @param name Committer name.
 * @param email Committer email.
 * @returns Return void.
 */
export const gitUser = (cwd: string, name: string = "Foo Bar", email: string = "email@foo.bar"): void => {
    execaSync("git", ["config", "--local", "user.email", email], { cwd });
    execaSync("git", ["config", "--local", "user.name", name], { cwd });
};

/**
 * @typedef {object} Commit
 * @property {string} branch The commit branch.
 * @property {string} hash The commit hash.
 * @property {string} message The commit message.
 */

/**
 * Create a Git repository.
 * _Created in a temp folder._
 * @param branch="master" The branch to initialize the repository to.
 * @param branch
 * @returns String pointing to the CWD for the created Git repository.
 */
export const gitInit = (branch: string = "master"): string => {
    validate(branch, "branch: kebab");

    // Init Git in a temp directory.
    const cwd = temporaryDirectory();

    execaSync("git", ["init"], { cwd });
    execaSync("git", ["checkout", "-b", branch], { cwd });

    // Disable GPG signing for commits.
    gitConfig(cwd, "commit.gpgsign", false);
    gitUser(cwd);

    // Return directory.
    return cwd;
};

/**
 * Create a remote Git repository.
 * _Created in a temp folder._
 * @returns String URL of the remote origin.
 */
export const gitInitRemote = (): string => {
    // Init bare Git repository in a temp directory.
    const cwd = temporaryDirectory();

    execaSync("git", ["init", "--bare"], { cwd });

    // Turn remote path into a file URL.
    // Return URL for remote.
    return fileUrl(cwd);
};

/**
 * Get the current HEAD SHA in a local Git repository.
 * @param cwd The CWD of the Git repository.
 * @returns The SHA of the head commit.
 */
export const gitGetHead = (cwd: string): string => {
    validate(cwd, "cwd: absolute");

    // Await command and return HEAD SHA.
    return execaSync("git", ["rev-parse", "HEAD"], { cwd }).stdout;
};

/**
 * Create a remote Git repository and set it as the origin for a Git repository.
 * _Created in a temp folder._
 * @param cwd The cwd to create and set the origin for.
 * @param releaseBranch="null" Optional branch to be added in case of prerelease is activated for a branch.
 * @param releaseBranch
 * @returns String URL of the remote origin.
 */
export const gitInitOrigin = (cwd: string, releaseBranch: string | null = null): string => {
    validate(cwd, "cwd: absolute");

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
};

/**
 * Add files to staged commit in a Git repository.
 * @param cwd The cwd to create and set the origin for.
 * @param file="." The file to add, defaulting to "." (all files).
 * @param file
 * @returns
 */
export const gitAdd = (cwd: string, file: string = "."): void => {
    validate(cwd, "cwd: absolute");

    execaSync("git", ["add", file], { cwd });
};

/**
 * Create commit on a Git repository.
 * _Allows empty commits without any files added._
 * @param cwd The CWD of the Git repository.
 * @param message Commit message.
 * @returns Promise that resolves to the SHA for the commit.
 */
export const gitCommit = (cwd: string, message: string): string => {
    validate(cwd, "cwd: absolute");
    validate(message, "message: string+");

    execaSync("git", ["commit", "-m", message, "--no-gpg-sign"], { cwd });

    // Return HEAD SHA.
    return gitGetHead(cwd);
};

/**
 * `git add .` followed by `git commit`
 * _Allows empty commits without any files added._
 * @param cwd The CWD of the Git repository.
 * @param message Commit message.
 * @returns Promise that resolves to the SHA for the commit.
 */
export const gitCommitAll = (cwd: string, message: string): string => {
    validate(cwd, "cwd: absolute");
    validate(message, "message: string+");

    gitAdd(cwd);

    // return the SHA hash.
    return gitCommit(cwd, message);
};

/**
 * Push to a remote Git repository.
 * @param cwd The CWD of the Git repository.
 * @param remote The remote repository URL or name.
 * @param branch The branch to push.
 * @returns
 * @throws {Error} if the push failed.
 */
export const gitPush = (cwd: string, remote: string = "origin", branch: string = "master"): void => {
    validate(cwd, "cwd: absolute");
    validate(remote, "remote: string");
    validate(branch, "branch: lower");

    execaSync("git", ["push", "--tags", remote, `HEAD:${branch}`], { cwd });
};

/**
 * Create a tag on the HEAD commit in a local Git repository.
 * @param cwd The CWD of the Git repository.
 * @param tagName The tag name to create.
 * @param hash=false SHA for the commit on which to create the tag. If falsy the tag is created on the latest commit.
 * @param hash
 * @returns
 */
export const gitTag = (cwd: string, tagName: string, hash?: string): void => {
    validate(cwd, "cwd: absolute");
    validate(tagName, "tagName: string+");
    validate(hash, "hash: alphanumeric{40}?");

    // Run command.
    execaSync("git", hash ? ["tag", "-f", tagName, hash] : ["tag", tagName], { cwd });
};

/**
 * Get the commit message log of given commit SHA or branch name.
 * @param cwd The CWD of the Git repository.
 * @param number Limit the number of commits to output.
 * @param hash The commit SHA or branch name.
 * @returns Commit log message.
 */
export const gitGetLog = (cwd: string, number: number, hash: string): string => {
    validate(cwd, "cwd: absolute");
    validate(number, "number: integer");
    validate(hash, "hash: string+");

    // Run command.
    return execaSync("git", ["log", `-${number}`, hash], { cwd }).stdout;
};

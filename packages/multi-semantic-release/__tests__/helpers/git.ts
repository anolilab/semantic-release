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
 * @param name Configuration setting name to add.
 * @param value Configuration setting value to set.
 */
export const gitConfig = (cwd: string, name: string, value: string): void => {
    validate(cwd, "cwd: absolute");
    validate(name, "name: string+");

    execaSync("git", ["config", "--add", name, value], { cwd });
};

/**
 * Sets git user data.
 * @param cwd The CWD of the Git repository.
 * @param name Committer name to set.
 * @param email Committer email address to set.
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
 * Creates a Git repository in a temporary folder.
 * @param branch Branch name to initialize the repository to.
 * @returns String path pointing to the CWD for the created Git repository.
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
 * Creates a remote Git repository in a temporary folder.
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
 * Creates a remote Git repository and sets it as the origin for a Git repository. Created in a temporary folder.
 * @param cwd The cwd to create and set the origin for.
 * @param releaseBranch Optional branch to be added in case prerelease is activated for a branch.
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
 * Adds files to staged commit in a Git repository.
 * @param cwd The cwd to add files in.
 * @param file File path to add, defaulting to "." (all files).
 */
export const gitAdd = (cwd: string, file: string = "."): void => {
    validate(cwd, "cwd: absolute");

    execaSync("git", ["add", file], { cwd });
};

/**
 * Creates a commit on a Git repository. Allows empty commits without any files added.
 * @param cwd The CWD of the Git repository.
 * @param message Commit message to use.
 * @returns SHA string for the created commit.
 */
export const gitCommit = (cwd: string, message: string): string => {
    validate(cwd, "cwd: absolute");
    validate(message, "message: string+");

    execaSync("git", ["commit", "-m", message, "--no-gpg-sign"], { cwd });

    // Return HEAD SHA.
    return gitGetHead(cwd);
};

/**
 * Runs `git add .` followed by `git commit`. Allows empty commits without any files added.
 * @param cwd The CWD of the Git repository.
 * @param message Commit message to use.
 * @returns SHA string for the created commit.
 */
export const gitCommitAll = (cwd: string, message: string): string => {
    validate(cwd, "cwd: absolute");
    validate(message, "message: string+");

    gitAdd(cwd);

    // return the SHA hash.
    return gitCommit(cwd, message);
};

/**
 * Pushes to a remote Git repository.
 * @param cwd The CWD of the Git repository.
 * @param remote The remote repository URL or name.
 * @param branch The branch name to push.
 * @throws {Error} If the push failed.
 */
export const gitPush = (cwd: string, remote: string = "origin", branch: string = "master"): void => {
    validate(cwd, "cwd: absolute");
    validate(remote, "remote: string");
    validate(branch, "branch: lower");

    execaSync("git", ["push", "--tags", remote, `HEAD:${branch}`], { cwd });
};

/**
 * Creates a tag on the HEAD commit in a local Git repository.
 * @param cwd The CWD of the Git repository.
 * @param tagName The tag name to create.
 * @param hash Optional SHA for the commit on which to create the tag. If not provided, the tag is created on the latest commit.
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

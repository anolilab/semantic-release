// eslint-disable-next-line e18e/ban-dependencies
import { execa, execaSync } from "execa";

const HEAD = "HEAD";

const COMMIT_PEEL = "^{commit}";

/**
 * Resolve HEAD to a commit.
 * @param cwd The working directory.
 * @returns The commit SHA of HEAD.
 */
const getHeadCommit = async (cwd: string): Promise<string> => {
    const result = await execa("git", ["rev-parse", HEAD], { cwd });

    return result.stdout.trim();
};

/**
 * Resolve HEAD to a commit synchronously, to pin it before anything else can create commits.
 * @param cwd The working directory.
 * @returns The commit SHA of HEAD.
 */
const getHeadCommitSync = (cwd: string): string => execaSync("git", ["rev-parse", HEAD], { cwd }).stdout.trim();

/**
 * List the given files that changed between two commits, relative to `cwd`.
 * Fails instead of reporting no changes, so an unavailable commit (e.g. in a shallow clone) can't silently skip releases.
 * @param cwd The working directory.
 * @param files The files to check, relative to `cwd`.
 * @param fromGitHead The commit to compare from.
 * @param toGitHead The commit to compare to.
 * @returns The subset of `files` that differ between both commits.
 */
const getChangedFiles = async (cwd: string, files: string[], fromGitHead: string, toGitHead: string = HEAD): Promise<string[]> => {
    const result = await execa("git", ["diff", "--name-only", "--relative", fromGitHead, toGitHead, "--", ...files], { cwd, reject: false });

    if (result.exitCode !== 0) {
        throw new Error(`Cannot diff ${files.join(", ")} between ${fromGitHead} and ${toGitHead}: ${result.stderr}`);
    }

    return result.stdout.split("\n").filter(Boolean);
};

/**
 * Check that a commit is available locally, e.g. not cut off by a shallow clone.
 * @param cwd The working directory.
 * @param gitHead The commit to check.
 * @returns Whether git has the commit.
 */
const isCommitAvailable = async (cwd: string, gitHead: string): Promise<boolean> => {
    // `<rev>^{commit}` makes git check that the revision is a commit that exists locally
    const result = await execa("git", ["cat-file", "-e", gitHead + COMMIT_PEEL], { cwd, reject: false });

    return result.exitCode === 0;
};

/**
 * Read a file as it was at a commit.
 * @param cwd The working directory.
 * @param gitHead The commit to read from.
 * @param path The file path, relative to `cwd`.
 * @returns The file content, or undefined if the commit has no such file.
 * @throws If the commit itself is not available (e.g. in a shallow clone).
 */
const readFileAtCommit = async (cwd: string, gitHead: string, path: string): Promise<string | undefined> => {
    const result = await execa("git", ["show", `${gitHead}:./${path}`], { cwd, reject: false });

    if (result.exitCode === 0) {
        return result.stdout;
    }

    if (!(await isCommitAvailable(cwd, gitHead))) {
        throw new Error(`Cannot read ${path} at ${gitHead}: the commit is not available (shallow clone?)`);
    }

    return undefined;
};

export { getChangedFiles, getHeadCommit, getHeadCommitSync, isCommitAvailable, readFileAtCommit };

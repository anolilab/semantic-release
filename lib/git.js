import { execaSync } from "execa";

/**
 * Get all the tags for a given branch.
 *
 * @param {String} branch The branch for which to retrieve the tags.
 * @param {Object} [execaOptions] Options to pass to `execa`.
 * @param {Array<String>} filters List of string to be checked inside tags.
 *
 * @return {Array<String>} List of git tags.
 * @throws {Error} If the `git` command fails.
 * @internal
 */
export function getTags(branch, execaOptions, filters) {
    const { stdout } = execaSync("git", ["tag", "--merged", branch], execaOptions);

    const tags = stdout
        .split("\n")
        .map((tag) => tag.trim())
        .filter(Boolean);

    if (!filters || filters.length === 0) {
        return tags;
    }

    const validateSubstr = (t, f) => f.every((v) => t.includes(v));

    return tags.filter((tag) => validateSubstr(tag, filters));
}

/**
 * Get the commit sha for a given tag.
 *
 * @param {String} tagName Tag name for which to retrieve the commit sha.
 * @param {Object} [execaOptions] Options to pass to `execa`.
 *
 * @return {String} The commit sha of the tag in parameter or `null`.
 */
export function getTagHead(tagName, execaOptions) {
    return execaSync("git", ["rev-list", "-1", tagName], execaOptions).stdout;
}

/**
 * Lifted and tweaked from semantic-release because we follow how they bump their packages/dependencies.
 * https://github.com/semantic-release/semantic-release/blob/master/lib/utils.js
 */

import { gt, prerelease, rcompare } from "semver";

/**
 * HOC that applies highest/lowest semver function.
 * @param {Function} predicate High order function to be called.
 * @param {string|undefined} version1 Version 1 to be compared with.
 * @param {string|undefined} version2 Version 2 to be compared with.
 * @returns {string|undefined} Highest or lowest version.
 * @internal
 */
const _selectVersionBy = (predicate, version1, version2) => {
    if (predicate && version1 && version2) {
        return predicate(version1, version2) ? version1 : version2;
    }

    return version1 || version2;
};

/**
 * Gets highest semver function binding gt to the HOC selectVersionBy.
 */
export const getHighestVersion = _selectVersionBy.bind(null, gt);

/**
 * Retrieve the latest version from a list of versions.
 * @param {Array} versions Versions as string list.
 * @param {boolean|undefined} withPrerelease Prerelease flag.
 * @returns {string|undefined} Latest version.
 * @internal
 */
export function getLatestVersion(versions, withPrerelease) {
    return versions.filter((version) => withPrerelease || !prerelease(version)).sort(rcompare)[0];
}

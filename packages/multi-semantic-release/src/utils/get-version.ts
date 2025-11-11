/**
 * Lifted and tweaked from semantic-release because we follow how they bump their packages/dependencies.
 * https://github.com/semantic-release/semantic-release/blob/master/lib/utils.js
 */

import { gt, prerelease, rcompare } from "semver";

/**
 * HOC that applies highest/lowest semver function.
 * @param predicate High order function to be called.
 * @param version1 Version 1 to be compared with.
 * @param version2 Version 2 to be compared with.
 * @returns Highest or lowest version.
 * @internal
 */
const _selectVersionBy = (predicate: (a: string, b: string) => boolean, version1: string | undefined, version2: string | undefined): string | undefined => {
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
 * @param versions Versions as string list.
 * @param withPrerelease Prerelease flag.
 * @returns Latest version.
 * @internal
 */
export const getLatestVersion = (versions: string[], withPrerelease?: boolean): string | undefined =>
    versions.filter((version: string) => withPrerelease || !prerelease(version)).toSorted(rcompare)[0];

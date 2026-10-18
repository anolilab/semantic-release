import semver from "semver";

/** Release levels, from least to most severe. */
const RELEASE_LEVELS = ["patch", "minor", "major"] as const;

type ReleaseLevel = (typeof RELEASE_LEVELS)[number];

const getSeverity = (releaseType: string | null | undefined): number => RELEASE_LEVELS.indexOf(releaseType as ReleaseLevel);

/**
 * Check whether a value is a release level.
 * @param value The value to check.
 * @returns Whether the value is "patch", "minor" or "major".
 */
const isReleaseLevel = (value: unknown): value is ReleaseLevel => getSeverity(value as string) !== -1;

/**
 * Pick the most severe of several release types. Values that aren't release levels only win when nothing more severe is given first.
 * @param releaseTypes The release types, the first one being the current one.
 * @returns The most severe release type, or undefined if none is given.
 */
const maxReleaseType = <T extends string>(...releaseTypes: (T | null | undefined)[]): T | undefined => {
    let highest: T | undefined;

    for (const releaseType of releaseTypes) {
        if (releaseType && (highest === undefined || getSeverity(releaseType) > getSeverity(highest))) {
            highest = releaseType;
        }
    }

    return highest;
};

/**
 * Get the lowest version a version or range allows, e.g. `^5` → `5.0.0`.
 * @param version A version or semver range.
 * @returns The lowest version, or undefined for specifiers that aren't semver (git or tarball URLs, tags such as `latest`).
 */
const getMinVersion = (version: string): string | undefined => {
    try {
        return semver.minVersion(version.trim())?.version;
    } catch {
        return undefined;
    }
};

/**
 * Classify the change between two versions or ranges by their lowest version, e.g. `^1.2.3` → `^2.0.0` is "major".
 * @param oldVersion The old version or range, e.g. `1.2.3`, `^5` or `>=4.17.0`.
 * @param newVersion The new version or range.
 * @returns The release level, or undefined if either isn't semver or major, minor and patch are equal.
 */
const getVersionChangeLevel = (oldVersion: string, newVersion: string): ReleaseLevel | undefined => {
    const oldClean = getMinVersion(oldVersion);
    const newClean = getMinVersion(newVersion);

    if (!oldClean || !newClean) {
        return undefined;
    }

    if (semver.major(oldClean) !== semver.major(newClean)) {
        return "major";
    }

    if (semver.minor(oldClean) !== semver.minor(newClean)) {
        return "minor";
    }

    return semver.patch(oldClean) === semver.patch(newClean) ? undefined : "patch";
};

export { getVersionChangeLevel, isReleaseLevel, maxReleaseType, RELEASE_LEVELS };
export type { ReleaseLevel };

import semver from "semver";

/** Release levels, from least to most severe. */
const RELEASE_LEVELS = ["patch", "minor", "major"] as const;

type ReleaseLevel = (typeof RELEASE_LEVELS)[number];

const VERSION_PREFIX_REGEX = /^[\^~]/u;

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
 * Classify the change between two versions, e.g. `^1.2.3` → `^2.0.0` is "major".
 * @param oldVersion The old version, optionally prefixed with `^` or `~`.
 * @param newVersion The new version, optionally prefixed with `^` or `~`.
 * @returns The release level, or undefined if either version isn't valid semver or major, minor and patch are equal.
 */
const getVersionChangeLevel = (oldVersion: string, newVersion: string): ReleaseLevel | undefined => {
    const oldClean = semver.valid(oldVersion.replace(VERSION_PREFIX_REGEX, "").trim());
    const newClean = semver.valid(newVersion.replace(VERSION_PREFIX_REGEX, "").trim());

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

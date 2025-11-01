import { writeFileSync } from "node:fs";

import { isEqual, isObject, transform } from "lodash-es";
import semver from "semver";

import getManifest from "./get-manifest.js";
import logger from "./logger.js";
import { getHighestVersion, getLatestVersion } from "./utils/get-version.js";
import recognizeFormat from "./utils/recognize-format.js";

const { debug } = logger.withScope("msr:updateDeps");

/**
 * Resolve next prerelease comparing bumped tags versions with last version.
 * @param {string|null} latestTag Last released tag from branch or null if non-existent.
 * @param {string} lastVersion Last version released.
 * @param {string} packagePreRelease Prerelease tag from package to-be-released.
 * @returns {string} Next pkg version.
 * @internal
 */
const _nextPreHighestVersion = (latestTag, lastVersion, packagePreRelease) => {
    const bumpFromTags = latestTag ? semver.inc(latestTag, "prerelease", packagePreRelease) : null;
    const bumpFromLast = semver.inc(lastVersion, "prerelease", packagePreRelease);

    return bumpFromTags ? getHighestVersion(bumpFromLast, bumpFromTags) : bumpFromLast;
};

/**
 * Resolve next prerelease special cases: highest version from tags or major/minor/patch.#
 * @param {Array<string>} tags - if non-empty, we will use these tags as part fo the comparison
 * @param {string} lastVersionForCurrentMultiRelease Last package version released from multi-semantic-release
 * @param {string} packageNextType Next type evaluated for the next package type.
 * @param {string} packagePreRelease Package prerelease suffix.
 * @returns {string|undefined} Next pkg version.
 * @internal
 */
const _nextPreVersionCases = (tags, lastVersionForCurrentMultiRelease, packageNextType, packagePreRelease) => {
    // Case 1: Normal release on last version and is now converted to a prerelease
    if (!semver.prerelease(lastVersionForCurrentMultiRelease)) {
        const { major, minor, patch } = semver.parse(lastVersionForCurrentMultiRelease);

        return `${semver.inc(`${major}.${minor}.${patch}`, packageNextType || "patch")}-${packagePreRelease}.1`;
    }

    // Case 2: Validates version with tags
    const latestTag = getLatestVersion(tags, true);

    return _nextPreHighestVersion(latestTag, lastVersionForCurrentMultiRelease, packagePreRelease);
};

/**
 * Get dependent release type by recursive scanning and updating pkg deps.
 * @param {Package} package_ The package with local deps to check.
 * @param {string} bumpStrategy Dependency resolution strategy: override, satisfy, inherit.
 * @param {string} releaseStrategy Release type triggered by deps updating: patch, minor, major, inherit.
 * @param {Package[]} ignore Packages to ignore (to prevent infinite loops).
 * @param {string} prefix Dependency version prefix to be attached if `bumpStrategy='override'`. ^ | ~ | '' (defaults to empty string)
 * @returns {string|undefined} Returns the highest release type if found, undefined otherwise
 * @internal
 */
const getDependentRelease = (package_, bumpStrategy, releaseStrategy, ignore, prefix) => {
    const severityOrder = ["patch", "minor", "major"];
    const { localDeps, manifest = {} } = package_;
    const lastVersion = package_._lastRelease && package_._lastRelease.version;
    const { dependencies = {}, devDependencies = {}, optionalDependencies = {}, peerDependencies = {} } = manifest;
    const scopes = [dependencies, devDependencies, peerDependencies, optionalDependencies];
    const bumpDependency = (scope, name, nextVersion) => {
        const currentVersion = scope[name];

        if (!nextVersion || !currentVersion) {
            return false;
        }

        // eslint-disable-next-line no-use-before-define
        const resolvedVersion = resolveNextVersion(currentVersion, nextVersion, bumpStrategy, prefix);

        if (currentVersion !== resolvedVersion) {
            // eslint-disable-next-line no-param-reassign
            scope[name] = resolvedVersion;

            return true;
        }

        return false;
    };

    return (
        localDeps
            .filter((p) => !ignore.includes(p))
            // eslint-disable-next-line unicorn/no-array-reduce
            .reduce((releaseType, p) => {
                // Has changed if...
                // 1. Any local dep package itself has changed
                // 2. Any local dep package has local deps that have changed.
                // eslint-disable-next-line no-use-before-define
                const nextType = resolveReleaseType(p, bumpStrategy, releaseStrategy, [...ignore, package_], prefix);
                const nextVersion = nextType
                    ? // Update the nextVersion only if there is a next type to be bumped

                    p._preRelease
                        ? // eslint-disable-next-line no-use-before-define
                        getNextPreVersion(p)
                        : // eslint-disable-next-line no-use-before-define
                        getNextVersion(p)
                    : // Set the nextVersion fallback to the last local dependency package last version
                    p._lastRelease && p._lastRelease.version;

                // 3. And this change should correspond to the manifest updating rule.
                const requireRelease = scopes
                    // eslint-disable-next-line unicorn/no-array-reduce
                    .reduce((result, scope) => bumpDependency(scope, p.name, nextVersion) || result, !lastVersion);

                return requireRelease && severityOrder.indexOf(nextType) > severityOrder.indexOf(releaseType) ? nextType : releaseType;
            }, undefined)
    );
};

/**
 * Substitute "workspace:" in currentVersion
 * See:
 * {@link https://yarnpkg.com/features/workspaces#publishing-workspaces}
 * {@link https://pnpm.io/workspaces#publishing-workspace-packages}
 * @param {string} currentVersion Current version, may start with "workspace:"
 * @param {string} nextVersion Next version
 * @returns {string} current version without "workspace:"
 */
const substituteWorkspaceVersion = (currentVersion, nextVersion) => {
    if (currentVersion.startsWith("workspace:")) {
        // eslint-disable-next-line regexp/optimal-quantifier-concatenation
        const [, range, caret] = /^workspace:(([\^~*])?.*)$/u.exec(currentVersion);

        return caret === range ? caret === "*" ? nextVersion : caret + nextVersion : range;
    }

    return currentVersion;
};

// eslint-disable-next-line no-secrets/no-secrets
// https://gist.github.com/Yimiprod/7ee176597fef230d1451
const difference = (object, base) =>
    transform(object, (result, value, key) => {
        if (!isEqual(value, base[key])) {
            // eslint-disable-next-line no-param-reassign
            result[key] = isObject(value) && isObject(base[key]) ? difference(value, base[key]) : `${base[key]} → ${value}`;
        }
    });

/**
 * Clarify what exactly was changed in manifest file.
 * @param {object} actualManifest manifest object
 * @param {string} path manifest path
 * @returns {boolean} has changed or not
 * @internal
 */
const auditManifestChanges = (actualManifest, path) => {
    const debugPrefix = `[${actualManifest.name}]`;
    const oldManifest = getManifest(path);
    const depScopes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
    // eslint-disable-next-line unicorn/no-array-reduce
    const changes = depScopes.reduce((result, scope) => {
        const diff = difference(actualManifest[scope], oldManifest[scope]);

        if (Object.keys(diff).length > 0) {
            // eslint-disable-next-line no-param-reassign
            result[scope] = diff;
        }

        return result;
    }, {});

    debug(debugPrefix, "package.json path=", path);

    if (Object.keys(changes).length > 0) {
        debug(debugPrefix, "changes=", changes);

        return true;
    }

    debug(debugPrefix, "no deps changes");

    return false;
};

/**
 * Resolve next package version.
 * @param {Package} package_ Package object.
 * @returns {string|undefined} Next pkg version.
 * @internal
 */
export const getNextVersion = (package_) => {
    const lastVersion = package_._lastRelease && package_._lastRelease.version;

    return lastVersion && typeof package_._nextType === "string" ? semver.inc(lastVersion, package_._nextType) : lastVersion || "1.0.0";
};

/**
 * Parse the prerelease tag from a semver version.
 * @param {string} version Semver version in a string format.
 * @returns {string|null} preReleaseTag Version prerelease tag or null.
 * @internal
 */
export const getPreReleaseTag = (version) => {
    const parsed = semver.parse(version);

    if (!parsed) {
        return null;
    }

    return parsed.prerelease[0] || null;
};

/**
 * Resolve next package version on prereleases.
 *
 * Will resolve highest next version of either:
 *
 * 1. The last release for the package during this multi-release cycle
 * 2. (if tag options provided):
 * a. the highest increment of the tags array provided
 * b. the highest increment of the gitTags for the prerelease
 * @param {Package} package_ Package object.
 * @returns {string|undefined} Next pkg version.
 * @internal
 */
export const getNextPreVersion = (package_) => {
    // Note: this is only set is a current multi-semantic-release released
    const lastVersionForCurrentRelease = package_._lastRelease && package_._lastRelease.version;

    const lastPreReleaseTag = getPreReleaseTag(lastVersionForCurrentRelease);
    const isNewPreReleaseTag = lastPreReleaseTag && lastPreReleaseTag !== package_._preRelease;

    return isNewPreReleaseTag || !lastVersionForCurrentRelease
        ? `1.0.0-${package_._preRelease}.1`
        : _nextPreVersionCases([], lastVersionForCurrentRelease, package_._nextType, package_._preRelease);
};

/**
 * Resolve package release type taking into account the cascading dependency update.
 * @param {Package} package_ Package object.
 * @param {string|undefined} bumpStrategy Dependency resolution strategy: override, satisfy, inherit.
 * @param {string|undefined} releaseStrategy Release type triggered by deps updating: patch, minor, major, inherit.
 * @param {Package[]} ignore Packages to ignore (to prevent infinite loops).
 * @param {string} prefix Dependency version prefix to be attached if `bumpStrategy='override'`. ^ | ~ | '' (defaults to empty string)
 * @returns {string|undefined} Resolved release type.
 * @internal
 */
export const resolveReleaseType = (package_, bumpStrategy = "override", releaseStrategy = "patch", ignore = [], prefix = "") => {
    // NOTE This fn also updates pkg deps, so it must be invoked anyway.
    const dependentReleaseType = getDependentRelease(package_, bumpStrategy, releaseStrategy, ignore, prefix);

    // Release type found by commitAnalyzer.
    if (package_._nextType) {
        return package_._nextType;
    }

    if (!dependentReleaseType) {
        return undefined;
    }

    // Define release type for dependent package if any of its deps changes.
    // `patch`, `minor`, `major` — strictly declare the release type that occurs when any dependency is updated.
    // `inherit` — applies the "highest" release of updated deps to the package.
    // For example, if any dep has a breaking change, `major` release will be applied to the all dependants up the chain.

    // eslint-disable-next-line no-param-reassign
    package_._nextType = releaseStrategy === "inherit" ? dependentReleaseType : releaseStrategy;

    return package_._nextType;
};

/**
 * Resolve next version of dependency.
 * @param {string} currentVersion Current dep version
 * @param {string} nextVersion Next release type: patch, minor, major
 * @param {string|undefined} bumpStrategy Resolution strategy: inherit, override, satisfy
 * @param {string} prefix Dependency version prefix to be attached if `bumpStrategy='override'`. ^ | ~ | '' (defaults to empty string)
 * @returns {string} Next dependency version
 * @internal
 */
export const resolveNextVersion = (currentVersion, nextVersion, bumpStrategy = "override", prefix = "") => {
    // handle cases of "workspace protocol" defined in yarn and pnpm workspace, whose version starts with "workspace:"
    // eslint-disable-next-line no-param-reassign
    currentVersion = substituteWorkspaceVersion(currentVersion, nextVersion);

    // if strategy is ignore, return the current version
    if (bumpStrategy === "ignore") {
        return currentVersion;
    }

    // no change...
    if (currentVersion === nextVersion) {
        return currentVersion;
    }

    // Check the next pkg version against its current references.
    // If it matches (`*` matches to any, `1.1.0` matches `1.1.x`, `1.5.0` matches to `^1.0.0` and so on)
    // release will not be triggered, if not `override` strategy will be applied instead.
    if ((bumpStrategy === "satisfy" || bumpStrategy === "inherit") && semver.satisfies(nextVersion, currentVersion)) {
        return currentVersion;
    }

    // `inherit` will try to follow the current declaration version/range.
    // `~1.0.0` + `minor` turns into `~1.1.0`, `1.x` + `major` gives `2.x`,
    // but `1.x` + `minor` gives `1.x` so there will be no release, etc.
    if (bumpStrategy === "inherit") {
        const separator = ".";
        const nextChunks = nextVersion.split(separator);
        const currentChunks = currentVersion.split(separator);
        const resolvedChunks = currentChunks.map((chunk, index) => nextChunks[index] ? chunk.replace(/\d+/u, nextChunks[index]) : chunk);

        return resolvedChunks.join(separator);
    }

    // "override"
    // By default next package version would be set as is for the all dependants.
    return prefix + nextVersion;
};

/**
 * Update pkg deps.
 * @param {Package} package_ The package this function is being called on.
 * @returns {void}
 * @internal
 */
export const updateManifestDeps = (package_) => {
    const { manifest, path } = package_;
    const { indent, trailingWhitespace } = recognizeFormat(manifest.__contents__);

    // We need to bump pkg.version for correct yarn.lock update
    // https://github.com/qiwi/multi-semantic-release/issues/58
    manifest.version = package_._nextRelease.version || manifest.version;

    // Loop through localDeps to verify release consistency.
    package_.localDeps.forEach((d) => {
        // Get version of dependency.
        const release = d._nextRelease || d._lastRelease;

        // Cannot establish version.
        if (!release || !release.version) {
            throw new Error(`Cannot release ${package_.name} because dependency ${d.name} has not been released yet`);
        }
    });

    if (!auditManifestChanges(manifest, path)) {
        return;
    }

    // Write package.json back out.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(path, JSON.stringify(manifest, null, indent) + trailingWhitespace);
};

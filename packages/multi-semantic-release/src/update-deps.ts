/* eslint-disable jsdoc/match-description */
import { writeFileSync } from "node:fs";

import { isEqual, isObject, transform } from "lodash-es";
import type { ReleaseType } from "semver";
import semver from "semver";

import getManifest from "./get-manifest";
import logger from "./logger";
import type { Package, PackageManifest, ReleaseStrategy } from "./types";
import { getHighestVersion, getLatestVersion } from "./utils/get-version";
import recognizeFormat from "./utils/recognize-format";

const { debug } = logger.withScope("msr:updateDeps");

/**
 * Resolve the release type to use based on the release strategy and dependency release type.
 * @param releaseStrategy The release strategy (string or mapping object).
 * @param dependencyReleaseType The release type of the dependency (patch, minor, major).
 * @returns The release type to apply to the dependent package.
 * @internal
 */
const resolveReleaseTypeFromStrategy = (
    releaseStrategy:
        | ReleaseStrategy
        | { major?: Omit<ReleaseStrategy, "inherit">; minor?: Omit<ReleaseStrategy, "inherit">; patch?: Omit<ReleaseStrategy, "inherit"> },
    dependencyReleaseType: Omit<ReleaseStrategy, "inherit"> | undefined,
): Omit<ReleaseStrategy, "inherit"> | undefined => {
    // If it's a string, use it directly (backward compatible)
    if (typeof releaseStrategy === "string") {
        if (releaseStrategy === "inherit") {
            return dependencyReleaseType;
        }

        return releaseStrategy as Omit<ReleaseStrategy, "inherit">;
    }

    // If it's an object mapping, use the mapping based on dependency release type
    if (dependencyReleaseType && releaseStrategy[dependencyReleaseType as keyof typeof releaseStrategy]) {
        return releaseStrategy[dependencyReleaseType as keyof typeof releaseStrategy];
    }

    // Fallback: if no mapping for this dependency type, return undefined (no release)
    return undefined;
};

/**
 * Resolve next prerelease comparing bumped tags versions with last version.
 * @param latestTag Last released tag from branch or null if non-existent.
 * @param lastVersion Last version released.
 * @param packagePreRelease Prerelease tag from package to-be-released.
 * @returns Next pkg version.
 * @internal
 */
const nextPreHighestVersion = (latestTag: string | undefined, lastVersion: string, packagePreRelease: string): string | undefined => {
    const bumpFromTags = latestTag ? semver.inc(latestTag, "prerelease", packagePreRelease) : undefined;
    const bumpFromLast = semver.inc(lastVersion, "prerelease", packagePreRelease) || undefined;

    return bumpFromTags ? getHighestVersion(bumpFromLast, bumpFromTags) : bumpFromLast;
};

/**
 * Resolve next prerelease special cases: highest version from tags or major/minor/patch.#.
 * @param tags If non-empty, we will use these tags as part of the comparison.
 * @param lastVersionForCurrentMultiRelease Last package version released from multi-semantic-release.
 * @param packageNextType Next type evaluated for the next package type.
 * @param packagePreRelease Package prerelease suffix.
 * @returns Next pkg version.
 * @internal
 */
const nextPreVersionCases = (
    tags: string[],
    lastVersionForCurrentMultiRelease: string,
    packageNextType: string,
    packagePreRelease: string,
): string | undefined => {
    if (!semver.prerelease(lastVersionForCurrentMultiRelease)) {
        const parsed = semver.parse(lastVersionForCurrentMultiRelease);

        if (!parsed) {
            return undefined;
        }

        const incrementedVersion = semver.inc(lastVersionForCurrentMultiRelease, (packageNextType || "patch") as ReleaseType);

        if (!incrementedVersion) {
            return undefined;
        }

        return `${incrementedVersion}-${packagePreRelease}.1`;
    }

    const latestTag = getLatestVersion(tags, true);

    return nextPreHighestVersion(latestTag, lastVersionForCurrentMultiRelease, packagePreRelease);
};

/**
 * Get dependent release type by recursive scanning and updating pkg deps.
 * @param packageJson The package with local deps to check.
 * @param bumpStrategy Dependency resolution strategy: override, satisfy, inherit.
 * @param releaseStrategy Release type triggered by deps updating: patch, minor, major, inherit, or mapping object.
 * @param ignore Packages to ignore (to prevent infinite loops).
 * @param prefix Dependency version prefix to be attached if `bumpStrategy='override'`. ^ | ~ | '' (defaults to empty string)
 * @returns Returns the highest release type if found, undefined otherwise
 * @internal
 */
const getDependentRelease = (
    packageJson: Package,
    bumpStrategy: string,
    releaseStrategy:
        | ReleaseStrategy
        | { major?: Omit<ReleaseStrategy, "inherit">; minor?: Omit<ReleaseStrategy, "inherit">; patch?: Omit<ReleaseStrategy, "inherit"> },
    ignore: Package[],
    prefix: string,
): string | undefined => {
    const severityOrder = ["patch", "minor", "major"] as const;
    const { localDeps, manifest = {} } = packageJson;
    const lastVersion: string | undefined = packageJson._lastRelease?.version;
    const { dependencies = {}, devDependencies = {}, optionalDependencies = {}, peerDependencies = {} } = manifest as PackageManifest;
    // All scopes for updating versions (including devDependencies)
    const allScopes: Record<string, string>[] = [dependencies, devDependencies, peerDependencies, optionalDependencies];
    // Only runtime scopes for triggering releases (excluding devDependencies)
    const releaseScopes: Record<string, string>[] = [dependencies, peerDependencies, optionalDependencies];

    const bumpDependency = (scope: Record<string, string>, name: string, nextVersion: string | undefined): boolean => {
        const currentVersion = scope[name];

        if (!nextVersion || !currentVersion) {
            return false;
        }

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const resolvedVersion = resolveNextVersion(currentVersion, nextVersion, bumpStrategy, prefix);

        if (currentVersion !== resolvedVersion) {
            // eslint-disable-next-line no-param-reassign
            scope[name] = resolvedVersion;

            return true;
        }

        return false;
    };

    let highestNestedReleaseType: string | undefined;

    const result = localDeps
        .filter((p: Package) => !ignore.includes(p))
        // eslint-disable-next-line unicorn/no-array-reduce, sonarjs/cognitive-complexity
        .reduce((releaseType: string | undefined, p: Package): string | undefined => {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const nextType: string | undefined = resolveReleaseType(p, bumpStrategy, releaseStrategy, [...ignore, packageJson], prefix);
            let nextVersion: string | undefined;

            if (nextType) {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                const version = p._preRelease ? getNextPreVersion(p) : getNextVersion(p);

                nextVersion = version || undefined;
            } else {
                nextVersion = p._lastRelease?.version;
            }

            let effectiveNextType = nextType;
            let effectiveNextVersion = nextVersion;

            if (!nextType && p.localDeps && p.localDeps.length > 0) {
                const nestedReleaseType = getDependentRelease(p, bumpStrategy, releaseStrategy, [...ignore, packageJson], prefix);

                if (nestedReleaseType) {
                    const nestedIndex = severityOrder.indexOf(nestedReleaseType as (typeof severityOrder)[number]);
                    const currentIndex = highestNestedReleaseType ? severityOrder.indexOf(highestNestedReleaseType as (typeof severityOrder)[number]) : -1;

                    if (nestedIndex > currentIndex) {
                        highestNestedReleaseType = nestedReleaseType;
                    }

                    // Use nested release type as the effective next type if no direct nextType
                    effectiveNextType = nestedReleaseType;

                    // Calculate the next version based on the nested release type
                    if (effectiveNextType && p._lastRelease?.version) {
                        // Temporarily set _nextType to calculate the version
                        const originalNextType = p._nextType;

                        // eslint-disable-next-line no-param-reassign
                        p._nextType = effectiveNextType as ReleaseType;
                        // eslint-disable-next-line @typescript-eslint/no-use-before-define
                        const calculatedVersion = p._preRelease ? getNextPreVersion(p) : getNextVersion(p);

                        effectiveNextVersion = calculatedVersion || undefined;

                        // Restore original _nextType
                        // eslint-disable-next-line no-param-reassign
                        p._nextType = originalNextType;
                    }
                }
            }

            // Update all dependencies (including devDependencies) but only check runtime deps for triggering releases
            allScopes.forEach((scope) => bumpDependency(scope, p.name, effectiveNextVersion || nextVersion));
            const requireRelease: boolean
                = releaseScopes.some((scope: Record<string, string>) => {
                    const currentVersion = scope[p.name];
                    const versionToCheck = effectiveNextVersion || nextVersion;

                    if ((!effectiveNextVersion && !nextVersion) || !currentVersion || !versionToCheck) {
                        return false;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    const resolvedVersion = resolveNextVersion(currentVersion, versionToCheck, bumpStrategy, prefix);

                    return currentVersion !== resolvedVersion;
                }) || !lastVersion;

            // If we have an effectiveNextType (either directly or from nested dependencies), we should trigger a release
            // even if the dependency version itself didn't change
            const shouldTriggerRelease = requireRelease || (effectiveNextType && effectiveNextType !== nextType);

            if (!shouldTriggerRelease) {
                return releaseType;
            }

            // Use effectiveNextType if available, otherwise fall back to nextType
            const typeToUse = effectiveNextType || nextType;

            if (!typeToUse) {
                return releaseType;
            }

            // Apply release strategy mapping if configured
            const mappedReleaseType = resolveReleaseTypeFromStrategy(releaseStrategy, typeToUse as Omit<ReleaseStrategy, "inherit">);

            if (!mappedReleaseType) {
                return releaseType;
            }

            if (!releaseType) {
                return mappedReleaseType as string | undefined;
            }

            const mappedIndex = severityOrder.indexOf(mappedReleaseType as (typeof severityOrder)[number]);
            const releaseIndex = severityOrder.indexOf(releaseType as (typeof severityOrder)[number]);

            return (mappedIndex > releaseIndex ? mappedReleaseType : releaseType) as string | undefined;
        }, undefined);

    if (!result && highestNestedReleaseType) {
        // Apply release strategy mapping to nested release type
        const mappedNestedReleaseType = resolveReleaseTypeFromStrategy(releaseStrategy, highestNestedReleaseType as Omit<ReleaseStrategy, "inherit">);

        return (mappedNestedReleaseType || highestNestedReleaseType) as string | undefined;
    }

    return result as string | undefined;
};

/**
 * Substitutes the "workspace:" prefix in the current version string with the actual version.
 *
 * See:
 * {@link https://yarnpkg.com/features/workspaces#publishing-workspaces}
 * {@link https://pnpm.io/workspaces#publishing-workspace-packages}
 * @param currentVersion Version string that may start with "workspace:" prefix.
 * @param nextVersion Target version to use when replacing workspace protocol.
 * @returns Version string without "workspace:" prefix.
 * @internal
 */
const substituteWorkspaceVersion = (currentVersion: string, nextVersion: string): string => {
    if (currentVersion.startsWith("workspace:")) {
        // eslint-disable-next-line regexp/optimal-quantifier-concatenation
        const match = /^workspace:(([\^~*])?.*)$/u.exec(currentVersion);

        if (!match) {
            return currentVersion;
        }

        const [, range, caret] = match;

        if (caret === range) {
            return caret === "*" ? nextVersion : caret + nextVersion;
        }

        return range as string;
    }

    return currentVersion;
};

const difference = (object: Record<string, unknown>, base: Record<string, unknown>): Record<string, string> => {
    const result = transform(object, (accumulator: Record<string, string>, value: unknown, key: string) => {
        if (!isEqual(value, base[key])) {
            accumulator[key]
                = isObject(value) && isObject(base[key])
                    ? JSON.stringify(difference(value as Record<string, unknown>, base[key] as Record<string, unknown>))
                    : `${base[key]} → ${value}`;
        }
    }) as Record<string, string> | undefined;

    return result || {};
};

/**
 * Clarify what exactly was changed in manifest file.
 * @param actualManifest Current manifest object to compare.
 * @param path File path to the manifest file.
 * @returns Whether manifest has changed or not.
 * @internal
 */
const auditManifestChanges = (actualManifest: Record<string, unknown>, path: string): boolean => {
    const debugPrefix = `[${actualManifest.name as string}]`;
    const oldManifest: Record<string, unknown> = getManifest(path);
    const depScopes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
    // eslint-disable-next-line unicorn/no-array-reduce
    const changes: Record<string, Record<string, string | Record<string, string>>> = depScopes.reduce(
        (result: Record<string, Record<string, string | Record<string, string>>>, scope: string) => {
            const diff = difference(actualManifest[scope] as Record<string, unknown>, oldManifest[scope] as Record<string, unknown>) as Record<
                string,
                string | Record<string, string>
            >;

            if (Object.keys(diff).length > 0) {
                // eslint-disable-next-line no-param-reassign
                result[scope] = diff;
            }

            return result;
        },
        {},
    );

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
 * @param packageJson Package object.
 * @returns Next pkg version.
 * @internal
 */
export const getNextVersion = (packageJson: Package): string | null => {
    const lastVersion: string | undefined = packageJson._lastRelease?.version;

    return lastVersion && typeof packageJson._nextType === "string" ? semver.inc(lastVersion, packageJson._nextType) : lastVersion || "1.0.0";
};

/**
 * Parse the prerelease tag from a semver version.
 * @param version Semver version in a string format.
 * @returns preReleaseTag Version prerelease tag or null.
 * @internal
 */
export const getPreReleaseTag = (version: string): string | null => {
    const parsed = semver.parse(version);

    if (!parsed) {
        return null;
    }

    const prereleaseTag = parsed.prerelease[0];

    if (prereleaseTag === undefined || prereleaseTag === null) {
        return null;
    }

    return String(prereleaseTag);
};

/**
 * Resolves the next package version on prereleases.
 * Determines the highest next version from either:
 * 1. The last release for the package during this multi-release cycle
 * 2. (if tag options provided):
 * a. The highest increment of the tags array provided
 * b. The highest increment of the gitTags for the prerelease
 * @param packageJson Package object to resolve version for.
 * @returns Next package version string.
 * @internal
 */
export const getNextPreVersion = (packageJson: Package): string | undefined => {
    // Note: this is only set is a current multi-semantic-release released
    const lastVersionForCurrentRelease: string | undefined = packageJson._lastRelease?.version;

    const lastPreReleaseTag: string | null = getPreReleaseTag(lastVersionForCurrentRelease || "");
    const isNewPreReleaseTag: boolean = lastPreReleaseTag !== null && lastPreReleaseTag !== packageJson._preRelease;

    return isNewPreReleaseTag || !lastVersionForCurrentRelease
        ? `1.0.0-${packageJson._preRelease}.1`
        : nextPreVersionCases([], lastVersionForCurrentRelease || "", packageJson._nextType || "patch", packageJson._preRelease || "");
};

/**
 * Resolve package release type taking into account the cascading dependency update.
 * @param packageJson Package object.
 * @param bumpStrategy Dependency resolution strategy: override, satisfy, inherit.
 * @param releaseStrategy Release type triggered by deps updating: patch, minor, major, inherit, or mapping object.
 * @param ignore Packages to ignore (to prevent infinite loops).
 * @param prefix Dependency version prefix to be attached if `bumpStrategy='override'`. ^ | ~ | '' (defaults to empty string)
 * @returns Resolved release type.
 * @internal
 */
export const resolveReleaseType = (
    packageJson: Package,
    bumpStrategy: string = "override",
    releaseStrategy:
        | ReleaseStrategy
        | { major?: Omit<ReleaseStrategy, "inherit">; minor?: Omit<ReleaseStrategy, "inherit">; patch?: Omit<ReleaseStrategy, "inherit"> } = "patch",
    ignore: Package[] = [],
    prefix: string = "",
): string | undefined => {
    const dependentReleaseType = getDependentRelease(packageJson, bumpStrategy, releaseStrategy, ignore, prefix);

    if (packageJson._nextType) {
        return packageJson._nextType;
    }

    if (!dependentReleaseType && packageJson.localDeps && packageJson.localDeps.length > 0 && packageJson.manifest) {
        const manifest = packageJson.manifest as PackageManifest;
        const { dependencies = {}, optionalDependencies = {}, peerDependencies = {} } = manifest;
        // Only check runtime dependencies (exclude devDependencies) for triggering releases
        const runtimeDeps = { ...dependencies, ...optionalDependencies, ...peerDependencies };

        const hasLocalDepInManifest = packageJson.localDeps.some((dep: Package) => {
            if (!dep.name || runtimeDeps[dep.name] === undefined) {
                return false;
            }

            if (dep._nextType) {
                return true;
            }

            if (dep.localDeps && dep.localDeps.length > 0) {
                const nestedType = getDependentRelease(dep, bumpStrategy, releaseStrategy, [...ignore, packageJson], prefix);

                return nestedType !== undefined;
            }

            return false;
        });

        if (hasLocalDepInManifest) {
            // Check if we can get a release type from nested dependencies when using inherit strategy
            if (typeof releaseStrategy === "string" && releaseStrategy === "inherit") {
                const nestedReleaseType = getDependentRelease(packageJson, bumpStrategy, releaseStrategy, ignore, prefix);

                if (nestedReleaseType) {
                    // eslint-disable-next-line no-param-reassign
                    packageJson._nextType = nestedReleaseType as ReleaseType;

                    return packageJson._nextType;
                }
            }

            // For non-inherit strategies, use the strategy directly (or default to patch if mapping)
            const strategyReleaseType = typeof releaseStrategy === "string" && releaseStrategy !== "inherit" ? releaseStrategy : "patch";

            // eslint-disable-next-line no-param-reassign
            packageJson._nextType = strategyReleaseType as ReleaseType;

            return packageJson._nextType;
        }
    }

    if (!dependentReleaseType) {
        return undefined;
    }

    // Apply release strategy mapping
    const finalReleaseType = resolveReleaseTypeFromStrategy(releaseStrategy, dependentReleaseType as "patch" | "minor" | "major");

    if (!finalReleaseType) {
        return undefined;
    }

    // eslint-disable-next-line no-param-reassign
    packageJson._nextType = finalReleaseType as ReleaseType;

    return packageJson._nextType;
};

/**
 * Resolve next version of dependency.
 * @param currentVersion Current dep version.
 * @param nextVersion Next release type: patch, minor, major.
 * @param bumpStrategy Resolution strategy: inherit, override, satisfy.
 * @param prefix Dependency version prefix to be attached if `bumpStrategy='override'`. ^ | ~ | '' (defaults to empty string).
 * @returns Next dependency version.
 * @internal
 */
export const resolveNextVersion = (currentVersion: string, nextVersion: string, bumpStrategy: string = "override", prefix: string = ""): string => {
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
        const nextChunks: string[] = nextVersion.split(separator);
        const currentChunks: string[] = currentVersion.split(separator);
        const resolvedChunks: string[] = currentChunks.map((chunk: string, index: number) => {
            if (nextChunks[index]) {
                return chunk.replace(/\d+/u, nextChunks[index]);
            }

            return chunk;
        });

        return resolvedChunks.join(separator);
    }

    return prefix + nextVersion;
};

/**
 * Update pkg deps.
 * @param packageJson The package this function is being called on.
 * @internal
 */
export const updateManifestDeps = (packageJson: Package): void => {
    const { manifest, path } = packageJson;
    const { indent, trailingWhitespace } = recognizeFormat(manifest.__contents__ as string);

    manifest.version = packageJson?._nextRelease?.version || manifest.version;

    packageJson.localDeps.forEach((d: Package) => {
        const release = d._nextRelease || d._lastRelease;

        if (!release || !release.version) {
            throw new Error(`Cannot release ${packageJson.name} because dependency ${d.name} has not been released yet`);
        }
    });

    if (!auditManifestChanges(manifest, path)) {
        return;
    }

    writeFileSync(path, JSON.stringify(manifest, null, indent) + trailingWhitespace);
};

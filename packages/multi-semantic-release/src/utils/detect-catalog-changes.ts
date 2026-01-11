import { isAccessibleSync, readJson } from "@visulima/fs";
import { readYamlSync } from "@visulima/fs/yaml";
import { resolve } from "@visulima/path";
import semver from "semver";

import logger from "../logger";
import type { Package } from "../types";
import cleanPath from "./clean-path";

const { debug } = logger.withScope("msr:catalogChanges");

interface CatalogChanges {
    [catalogName: string]: {
        [packageName: string]: {
            newVersion: string;
            oldVersion: string;
            releaseType: "major" | "minor" | "patch" | null;
        };
    };
}

interface CatalogFile {
    catalogs?: Record<string, Record<string, string>>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

/**
 * Parse pnpm-workspace.yaml file to extract catalog definitions.
 * @param cwd The workspace root directory.
 * @returns Catalog definitions or null if file doesn't exist or has no catalogs.
 */
const parsePnpmCatalog = (cwd: string): Record<string, Record<string, string>> | null => {
    const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

    if (!isAccessibleSync(catalogPath)) {
        return null;
    }

    try {
        const parsed = readYamlSync<CatalogFile>(catalogPath);

        return parsed.catalogs || null;
    } catch (error) {
        debug("Failed to parse pnpm-workspace.yaml:", error);

        return null;
    }
};

/**
 * Parse package.json file to extract yarn catalog definitions.
 * Yarn catalogs are defined in the root package.json under "catalogs" key.
 * @param cwd The workspace root directory.
 * @returns Catalog definitions or null if file doesn't exist or has no catalogs.
 */
const parseYarnCatalog = async (cwd: string): Promise<Record<string, Record<string, string>> | null> => {
    const catalogPath = resolve(cwd, "package.json");

    if (!isAccessibleSync(catalogPath)) {
        return null;
    }

    try {
        const parsed = (await readJson(catalogPath)) as CatalogFile;

        return parsed.catalogs || null;
    } catch (error) {
        debug("Failed to parse package.json for yarn catalog:", error);

        return null;
    }
};

/**
 * Get catalog definitions from either pnpm-workspace.yaml or package.json (yarn).
 * @param cwd The workspace root directory.
 * @returns Catalog definitions or null if no catalogs found.
 */
const getCatalogDefinitions = async (cwd: string): Promise<Record<string, Record<string, string>> | null> => {
    // Try pnpm first
    const pnpmCatalogs = parsePnpmCatalog(cwd);

    if (pnpmCatalogs) {
        return pnpmCatalogs;
    }

    // Fall back to yarn
    return parseYarnCatalog(cwd);
};

/**
 * Get catalog definitions from a specific git commit.
 * @param cwd The workspace root directory.
 * @param gitHead The git commit SHA to check.
 * @returns Catalog definitions or null if no catalogs found.
 */
const getCatalogDefinitionsAtCommit = async (cwd: string, gitHead: string): Promise<Record<string, Record<string, string>> | null> => {
    const { execa } = await import("execa");

    try {
        // Try pnpm-workspace.yaml first
        try {
            const result = await execa("git", ["show", `${gitHead}:pnpm-workspace.yaml`], { cwd, reject: false });

            if (result.exitCode === 0 && result.stdout) {
                // Parse YAML from string content
                const { parse: parseYaml } = await import("yaml");
                const parsed = parseYaml(result.stdout) as CatalogFile;

                if (parsed?.catalogs) {
                    return parsed.catalogs;
                }
            }
        } catch {
            // File might not exist at this commit, continue to try package.json
        }

        // Fall back to package.json (yarn catalog)
        try {
            const result = await execa("git", ["show", `${gitHead}:package.json`], { cwd, reject: false });

            if (result.exitCode === 0 && result.stdout) {
                const parsed = JSON.parse(result.stdout) as CatalogFile;

                return parsed.catalogs || null;
            }
        } catch {
            // File might not exist at this commit
        }
    } catch (error) {
        debug(`Failed to get catalog definitions at commit ${gitHead}:`, error);
    }

    return null;
};

/**
 * Determine release type based on version change.
 * @param oldVersion Old version string.
 * @param newVersion New version string.
 * @returns Release type or null if versions are invalid or same.
 */
const getReleaseTypeFromVersionChange = (oldVersion: string, newVersion: string): "major" | "minor" | "patch" | null => {
    // Extract version from range (e.g., "^1.2.3" -> "1.2.3")
    const extractVersion = (version: string): string => {
        const cleaned = version.replace(/^[\^~]/, "").trim();

        return cleaned;
    };

    const oldVersionClean = extractVersion(oldVersion);
    const newVersionClean = extractVersion(newVersion);

    if (!semver.valid(oldVersionClean) || !semver.valid(newVersionClean)) {
        return null;
    }

    if (semver.eq(oldVersionClean, newVersionClean)) {
        return null;
    }

    if (semver.major(oldVersionClean) !== semver.major(newVersionClean)) {
        return "major";
    }

    if (semver.minor(oldVersionClean) !== semver.minor(newVersionClean)) {
        return "minor";
    }

    if (semver.patch(oldVersionClean) !== semver.patch(newVersionClean)) {
        return "patch";
    }

    return null;
};

/**
 * Detect catalog changes between two commits.
 * @param cwd The workspace root directory.
 * @param lastReleaseGitHead The git commit SHA of the last release.
 * @param _nextReleaseGitHead The git commit SHA of the next release (defaults to HEAD).
 * @returns Map of catalog changes.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const detectCatalogChanges = async (cwd: string, lastReleaseGitHead?: string, _nextReleaseGitHead?: string): Promise<CatalogChanges> => {
    // eslint-disable-next-line no-param-reassign
    cwd = cleanPath(cwd);

    const currentCatalogs = await getCatalogDefinitions(cwd);

    if (!currentCatalogs) {
        debug("No catalog definitions found");

        return {};
    }

    if (!lastReleaseGitHead) {
        debug("No last release found, skipping catalog change detection");

        return {};
    }

    const oldCatalogs = await getCatalogDefinitionsAtCommit(cwd, lastReleaseGitHead);

    if (!oldCatalogs) {
        debug("No old catalog definitions found at last release");

        return {};
    }

    const changes: CatalogChanges = {};

    // Compare catalogs
    for (const [catalogName, catalogEntries] of Object.entries(currentCatalogs)) {
        const oldCatalogEntries = oldCatalogs[catalogName];

        if (!oldCatalogEntries) {
            // New catalog, skip for now (could be handled differently)
            continue;
        }

        for (const [packageName, newVersion] of Object.entries(catalogEntries)) {
            const oldVersion = oldCatalogEntries[packageName];

            if (!oldVersion) {
                // New package in catalog, skip for now
                continue;
            }

            if (oldVersion !== newVersion) {
                const releaseType = getReleaseTypeFromVersionChange(oldVersion, newVersion);

                if (releaseType) {
                    if (!changes[catalogName]) {
                        changes[catalogName] = {};
                    }

                    changes[catalogName][packageName] = {
                        newVersion,
                        oldVersion,
                        releaseType,
                    };

                    debug(`Catalog change detected: ${catalogName}:${packageName} ${oldVersion} -> ${newVersion} (${releaseType})`);
                }
            }
        }
    }

    return changes;
};

/**
 * Find packages that use a specific catalog reference.
 * @param packages Array of packages to check.
 * @param catalogName The catalog name to search for (e.g., "cli", "dev").
 * @param packageName The package name within the catalog (optional, if provided only matches this package).
 * @returns Array of packages that use the catalog reference.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const findPackagesUsingCatalog = (packages: Package[], catalogName: string, packageName?: string): Package[] => {
    const catalogRef = `catalog:${catalogName}`;
    const matchingPackages: Package[] = [];

    for (const pkg of packages) {
        const { manifest } = pkg;
        // Only check runtime dependencies (exclude devDependencies) for triggering version bumps
        const depScopes = [manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies].filter(Boolean) as Record<string, string>[];

        for (const scope of depScopes) {
            for (const [depName, depVersion] of Object.entries(scope)) {
                // Check if this dependency uses the catalog reference
                if (depVersion === catalogRef) {
                    // If packageName is specified, check if it matches
                    if (packageName && depName !== packageName) {
                        continue;
                    }

                    matchingPackages.push(pkg);

                    break; // Found a match, no need to check other scopes for this package
                }
            }
        }
    }

    return matchingPackages;
};

/**
 * Get affected packages based on catalog changes.
 * @param packages Array of all packages in the monorepo.
 * @param catalogChanges Map of catalog changes.
 * @returns Map of package names to their triggered release types.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const getAffectedPackagesFromCatalogChanges = (packages: Package[], catalogChanges: CatalogChanges): Map<string, "major" | "minor" | "patch"> => {
    const affectedPackages = new Map<string, "major" | "minor" | "patch">();

    for (const [catalogName, catalogChangesForCatalog] of Object.entries(catalogChanges)) {
        for (const [packageName, change] of Object.entries(catalogChangesForCatalog)) {
            const packagesUsingCatalog = findPackagesUsingCatalog(packages, catalogName, packageName);

            for (const pkg of packagesUsingCatalog) {
                const currentReleaseType = affectedPackages.get(pkg.name);
                const newReleaseType = change.releaseType;

                if (!newReleaseType) {
                    continue;
                }

                if (currentReleaseType) {
                    // Use the highest severity release type
                    const severityOrder = { major: 3, minor: 2, patch: 1 };
                    const currentSeverity = severityOrder[currentReleaseType];
                    const newSeverity = severityOrder[newReleaseType];

                    if (newSeverity > currentSeverity) {
                        affectedPackages.set(pkg.name, newReleaseType);
                    }
                } else {
                    affectedPackages.set(pkg.name, newReleaseType);
                }
            }
        }
    }

    return affectedPackages;
};

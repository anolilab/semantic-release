import { isAccessibleSync, readJson } from "@visulima/fs";
import { readYamlSync } from "@visulima/fs/yaml";
import { resolve } from "@visulima/path";
import { parse as parseYaml } from "yaml";

import logger from "../logger";
import type { Package, PackageCatalogChange } from "../types";
import cleanPath from "./clean-path";
import { readFileAtCommit } from "./git";
import type { ReleaseLevel } from "./release-type";
import { getVersionChangeLevel, maxReleaseType } from "./release-type";

const { debug } = logger.withScope("msr:catalogChanges");

const DEFAULT_CATALOG_NAME = "default";

const DEFAULT_CATALOG_REFERENCE = "catalog:";

interface CatalogChanges {
    [catalogName: string]: {
        [packageName: string]: {
            newVersion: string;
            oldVersion: string;
            releaseType: ReleaseLevel | null;
        };
    };
}

interface CatalogFile {
    catalog?: Record<string, string>;
    catalogs?: Record<string, Record<string, string>>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

/**
 * Collect the catalogs of a parsed pnpm-workspace.yaml.
 * pnpm treats the top-level `catalog` as the catalog named "default", referenced as `catalog:` or `catalog:default`.
 * @param parsed The parsed pnpm-workspace.yaml.
 * @returns Catalog definitions or null if the file has no catalogs.
 */
const getPnpmCatalogs = (parsed: CatalogFile): Record<string, Record<string, string>> | null => {
    if (!parsed.catalog) {
        return parsed.catalogs ?? null;
    }

    return {
        ...parsed.catalogs,
        [DEFAULT_CATALOG_NAME]: { ...parsed.catalogs?.[DEFAULT_CATALOG_NAME], ...parsed.catalog },
    };
};

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
        const parsed = readYamlSync(catalogPath) as CatalogFile;

        return getPnpmCatalogs(parsed);
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

        return parsed.catalogs ?? null;
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
 * @throws If the commit is not available (e.g. in a shallow clone).
 */
const getCatalogDefinitionsAtCommit = async (cwd: string, gitHead: string): Promise<Record<string, Record<string, string>> | null> => {
    const workspaceFile = await readFileAtCommit(cwd, gitHead, "pnpm-workspace.yaml");

    if (workspaceFile) {
        try {
            const catalogs = getPnpmCatalogs(parseYaml(workspaceFile) as CatalogFile);

            if (catalogs) {
                return catalogs;
            }
        } catch (error) {
            debug(`Failed to parse pnpm-workspace.yaml at commit ${gitHead}:`, error);
        }
    }

    // Fall back to package.json (yarn catalog)
    const manifest = await readFileAtCommit(cwd, gitHead, "package.json");

    if (!manifest) {
        return null;
    }

    try {
        return (JSON.parse(manifest) as CatalogFile).catalogs ?? null;
    } catch (error) {
        debug(`Failed to parse package.json at commit ${gitHead}:`, error);

        return null;
    }
};

/**
 * Detect catalog changes between two commits.
 * @param cwd The workspace root directory.
 * @param lastReleaseGitHead The git commit SHA of the last release.
 * @param _nextReleaseGitHead The git commit SHA of the next release (defaults to HEAD).
 * @returns Map of catalog changes.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity, import/exports-last
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
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                continue;
            }

            if (oldVersion !== newVersion) {
                const releaseType = getVersionChangeLevel(oldVersion, newVersion);

                if (releaseType) {
                    changes[catalogName] ??= {};

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
 * Build the manifest specifier that references a named catalog, e.g. `catalog:cli`.
 * @param catalogName The catalog name, e.g. `default` for the top-level `catalog`.
 * @returns The specifier a manifest uses to depend on an entry of that catalog.
 */
const getCatalogReference = (catalogName: string): string => `${DEFAULT_CATALOG_REFERENCE}${catalogName}`;

/**
 * Spell the default catalog reference `catalog:` as `catalog:default`, the form catalog names are matched against.
 * @param dependencyVersion The dependency specifier from a manifest.
 * @returns The specifier, with the default catalog named explicitly.
 */
const normalizeCatalogReference = (dependencyVersion: string): string =>
    dependencyVersion === DEFAULT_CATALOG_REFERENCE ? getCatalogReference(DEFAULT_CATALOG_NAME) : dependencyVersion;

/**
 * Check if a package uses a specific catalog reference.
 * @param pkg The package to check.
 * @param catalogRef The catalog reference string.
 * @param packageName Optional package name filter.
 * @returns Whether the package uses the catalog reference.
 */
// eslint-disable-next-line unicorn/consistent-boolean-name
const packageUsesCatalog = (pkg: Package, catalogRef: string, packageName?: string): boolean => {
    const { manifest } = pkg;
    const dependencyScopes = [manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies].filter(Boolean) as Record<string, string>[];

    for (const scope of dependencyScopes) {
        for (const [dependencyName, dependencyVersion] of Object.entries(scope)) {
            if (normalizeCatalogReference(dependencyVersion) === catalogRef) {
                if (packageName && dependencyName !== packageName) {
                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
                    continue;
                }

                return true;
            }
        }
    }

    return false;
};

/**
 * Find packages that use a specific catalog reference.
 * @param packages Array of packages to check.
 * @param catalogName The catalog name to search for (e.g., "cli", "dev").
 * @param packageName The package name within the catalog (optional, if provided only matches this package).
 * @returns Array of packages that use the catalog reference.
 */
// eslint-disable-next-line import/exports-last
export const findPackagesUsingCatalog = (packages: Package[], catalogName: string, packageName?: string): Package[] => {
    const catalogRef = getCatalogReference(catalogName);

    return packages.filter((pkg) => packageUsesCatalog(pkg, catalogRef, packageName));
};

/**
 * Update affected packages map with a new release type.
 * @param affectedPackages The map to update.
 * @param packageName The name of the package to update.
 * @param newReleaseType The release type to apply.
 */
const updateAffectedPackage = (affectedPackages: Map<string, ReleaseLevel>, packageName: string, newReleaseType: ReleaseLevel): void => {
    affectedPackages.set(packageName, maxReleaseType(affectedPackages.get(packageName), newReleaseType) ?? newReleaseType);
};

/**
 * Get affected packages based on catalog changes.
 * @param packages Array of all packages in the monorepo.
 * @param catalogChanges Map of catalog changes.
 * @returns Map of package names to their triggered release types.
 */
export const getAffectedPackagesFromCatalogChanges = (packages: Package[], catalogChanges: CatalogChanges): Map<string, ReleaseLevel> => {
    const affectedPackages = new Map<string, ReleaseLevel>();

    for (const [catalogName, catalogChangesForCatalog] of Object.entries(catalogChanges)) {
        for (const [packageName, change] of Object.entries(catalogChangesForCatalog)) {
            const packagesUsingCatalog = findPackagesUsingCatalog(packages, catalogName, packageName);

            for (const pkg of packagesUsingCatalog) {
                if (change.releaseType) {
                    updateAffectedPackage(affectedPackages, pkg.name, change.releaseType);
                }
            }
        }
    }

    return affectedPackages;
};

/**
 * Get the catalog changes that affect a single package.
 * @param pkg The package to check.
 * @param catalogChanges Map of catalog changes, detected since this package's own last release.
 * @returns The changed catalog entries the package depends on (dependencies, peerDependencies, optionalDependencies).
 */
export const getPackageCatalogChanges = (pkg: Package, catalogChanges: CatalogChanges): PackageCatalogChange[] => {
    const changes: PackageCatalogChange[] = [];

    for (const [catalogName, catalogChangesForCatalog] of Object.entries(catalogChanges)) {
        for (const [dependencyName, change] of Object.entries(catalogChangesForCatalog)) {
            if (change.releaseType && packageUsesCatalog(pkg, getCatalogReference(catalogName), dependencyName)) {
                changes.push({ catalogName, dependencyName, newVersion: change.newVersion, oldVersion: change.oldVersion, releaseType: change.releaseType });
            }
        }
    }

    return changes;
};

export type { CatalogChanges };

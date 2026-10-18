import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { Package } from "../../src/types";
import { detectCatalogChanges, findPackagesUsingCatalog, getAffectedPackagesFromCatalogChanges } from "../../src/utils/detect-catalog-changes";
import { copyDirectory } from "../helpers/file";
import { gitCommitAll, gitInit } from "../helpers/git";

const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../__fixtures__");

describe("detect-catalog-changes", () => {
    describe("detectCatalogChanges()", () => {
        it("should detect no changes when catalogs are the same", async () => {
            expect.assertions(1);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.0.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial commit with catalogs");

            // No changes to catalogs
            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes).toStrictEqual({});
        });

        it("should compare with the given commit instead of the working tree", async () => {
            expect.assertions(1);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");
            const writeCatalog = (version: string): void => {
                writeFileSync(catalogPath, `packages:\n    - "packages/*"\n\ncatalogs:\n    cli:\n        semantic-release: ${version}\n`);
            };

            writeCatalog("^24.0.0");

            const initialSha = gitCommitAll(cwd, "feat: initial commit with catalogs");

            writeCatalog("^24.1.0");

            const currentSha = gitCommitAll(cwd, "chore: update catalog");

            // Neither a later commit nor an uncommitted change counts
            writeCatalog("^25.0.0");
            gitCommitAll(cwd, "chore(release): update catalog during the run");
            writeCatalog("^26.0.0");

            await expect(detectCatalogChanges(cwd, initialSha, currentSha)).resolves.toStrictEqual({
                cli: { "semantic-release": { newVersion: "^24.1.0", oldVersion: "^24.0.0", releaseType: "minor" } },
            });
        });

        it("should detect major version change in catalog", async () => {
            expect.assertions(3);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            // Initial catalog version
            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.0.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial catalog");

            // Update catalog version
            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^25.0.0
`,
            );

            gitCommitAll(cwd, "chore: update catalog");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes).toHaveProperty("cli");
            expect(changes.cli).toHaveProperty("semantic-release");
            expect(changes.cli?.["semantic-release"]).toStrictEqual({
                newVersion: "^25.0.0",
                oldVersion: "^24.0.0",
                releaseType: "major",
            });
        });

        it("should detect minor version change in catalog", async () => {
            expect.assertions(1);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.0.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial catalog");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.1.0
`,
            );

            gitCommitAll(cwd, "chore: update catalog");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes.cli?.["semantic-release"]).toStrictEqual({
                newVersion: "^24.1.0",
                oldVersion: "^24.0.0",
                releaseType: "minor",
            });
        });

        it("should detect patch version change in catalog", async () => {
            expect.assertions(1);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.0.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial catalog");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.0.1
`,
            );

            gitCommitAll(cwd, "chore: update catalog");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes.cli?.["semantic-release"]).toStrictEqual({
                newVersion: "^24.0.1",
                oldVersion: "^24.0.0",
                releaseType: "patch",
            });
        });

        it("should detect multiple catalog changes", async () => {
            expect.assertions(5);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^24.0.0
        "@semantic-release/changelog": ^5.0.0
    dev:
        typescript: ^5.0.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial catalog");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^25.0.0
        "@semantic-release/changelog": ^6.0.0
    dev:
        typescript: ^5.1.0
`,
            );

            gitCommitAll(cwd, "chore: update catalogs");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes).toHaveProperty("cli");
            expect(changes).toHaveProperty("dev");
            expect(changes.cli?.["semantic-release"]?.releaseType).toBe("major");
            expect(changes.cli?.["@semantic-release/changelog"]?.releaseType).toBe("major");
            expect(changes.dev?.["typescript"]?.releaseType).toBe("minor");
        });

        it("should return empty object when no last release", async () => {
            expect.assertions(1);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^25.0.0
`,
            );

            gitCommitAll(cwd, "feat: initial catalog");

            const changes = await detectCatalogChanges(cwd);

            expect(changes).toStrictEqual({});
        });

        it("should handle missing catalog file at old commit", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            // Create a dummy file for initial commit
            writeFileSync(resolve(cwd, "README.md"), "# Test\n");

            const initialSha = gitCommitAll(cwd, "feat: initial commit");

            // Add catalog file later
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^25.0.0
`,
            );

            gitCommitAll(cwd, "feat: add catalog");

            const changes = await detectCatalogChanges(cwd, initialSha);

            // Should return empty since we can't compare (no old catalog)
            expect(changes).toStrictEqual({});
        });

        it("should detect no changes when the default catalog is the same", async () => {
            expect.assertions(1);

            const cwd = gitInit();

            writeFileSync(
                resolve(cwd, "pnpm-workspace.yaml"),
                `packages:
    - "packages/*"

catalog:
    lodash-es: ^4.17.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial default catalog");

            writeFileSync(resolve(cwd, "README.md"), "# Test\n");
            gitCommitAll(cwd, "docs: add readme");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes).toStrictEqual({});
        });

        it('should detect changes in the default catalog as catalog "default"', async () => {
            expect.assertions(1);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalog:
    lodash-es: ^4.17.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial default catalog");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalog:
    lodash-es: ^4.18.0
`,
            );

            gitCommitAll(cwd, "chore: update default catalog");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes).toStrictEqual({
                default: {
                    "lodash-es": {
                        newVersion: "^4.18.0",
                        oldVersion: "^4.17.0",
                        releaseType: "minor",
                    },
                },
            });
        });

        it("should detect changes in the default catalog next to named catalogs", async () => {
            expect.assertions(2);

            const cwd = gitInit();
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalog:
    lodash-es: ^4.17.0

catalogs:
    cli:
        semantic-release: ^24.0.0
`,
            );

            const initialSha = gitCommitAll(cwd, "feat: initial catalogs");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalog:
    lodash-es: ^4.17.1

catalogs:
    cli:
        semantic-release: ^25.0.0
`,
            );

            gitCommitAll(cwd, "chore: update catalogs");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes.default?.["lodash-es"]?.releaseType).toBe("patch");
            expect(changes.cli?.["semantic-release"]?.releaseType).toBe("major");
        });
    });

    describe("findPackagesUsingCatalog()", () => {
        const createMockPackage = (name: string, dependencies: Record<string, string> = {}): Package =>
            ({
                manifest: {
                    dependencies,
                    devDependencies: {},
                    name,
                    optionalDependencies: {},
                    peerDependencies: {},
                },
                name,
            }) as Package;

        it("should find packages using a catalog reference", () => {
            expect.assertions(2);

            const packages: Package[] = [
                createMockPackage("package-a", { "semantic-release": "catalog:cli" }),
                createMockPackage("package-b", { "lodash-es": "catalog:prod" }),
                createMockPackage("package-c", { "semantic-release": "^24.0.0" }),
            ];

            const result = findPackagesUsingCatalog(packages, "cli");

            expect(result).toHaveLength(1);
            expect(result[0]?.name).toBe("package-a");
        });

        it("should NOT find packages using catalog in devDependencies (devDeps don't trigger releases)", () => {
            expect.assertions(1);

            const packages: Package[] = [
                {
                    manifest: {
                        dependencies: {},
                        devDependencies: { typescript: "catalog:dev" },
                        name: "package-a",
                        optionalDependencies: {},
                        peerDependencies: {},
                    },
                    name: "package-a",
                } as unknown as Package,
            ];

            const result = findPackagesUsingCatalog(packages, "dev");

            expect(result).toHaveLength(0);
        });

        it("should find packages using specific package in catalog", () => {
            expect.assertions(2);

            const packages: Package[] = [
                createMockPackage("package-a", { "semantic-release": "catalog:cli" }),
                createMockPackage("package-b", { "@semantic-release/changelog": "catalog:cli" }),
            ];

            const result = findPackagesUsingCatalog(packages, "cli", "semantic-release");

            expect(result).toHaveLength(1);
            expect(result[0]?.name).toBe("package-a");
        });

        it("should return empty array when no packages use catalog", () => {
            expect.assertions(1);

            const packages: Package[] = [
                createMockPackage("package-a", { "semantic-release": "^24.0.0" }),
                createMockPackage("package-b", { "lodash-es": "^4.17.0" }),
            ];

            const result = findPackagesUsingCatalog(packages, "cli");

            expect(result).toHaveLength(0);
        });

        it("should find packages using the default catalog as catalog: or catalog:default", () => {
            expect.assertions(1);

            const packages: Package[] = [
                createMockPackage("package-a", { "lodash-es": "catalog:" }),
                createMockPackage("package-b", { "lodash-es": "catalog:default" }),
                createMockPackage("package-c", { "lodash-es": "catalog:prod" }),
            ];

            const result = findPackagesUsingCatalog(packages, "default", "lodash-es");

            expect(result.map((pkg) => pkg.name)).toStrictEqual(["package-a", "package-b"]);
        });

        it("should find packages using the default catalog in peerDependencies and optionalDependencies", () => {
            expect.assertions(1);

            const packages: Package[] = [
                {
                    manifest: { name: "package-a", optionalDependencies: { "lodash-es": "catalog:default" }, peerDependencies: {} },
                    name: "package-a",
                } as unknown as Package,
                {
                    manifest: { name: "package-b", optionalDependencies: {}, peerDependencies: { "lodash-es": "catalog:" } },
                    name: "package-b",
                } as unknown as Package,
            ];

            const result = findPackagesUsingCatalog(packages, "default", "lodash-es");

            expect(result.map((pkg) => pkg.name)).toStrictEqual(["package-a", "package-b"]);
        });
    });

    describe("getAffectedPackagesFromCatalogChanges()", () => {
        // eslint-disable-next-line sonarjs/no-identical-functions
        const createMockPackage = (name: string, dependencies: Record<string, string> = {}): Package =>
            ({
                manifest: {
                    dependencies,
                    devDependencies: {},
                    name,
                    optionalDependencies: {},
                    peerDependencies: {},
                },
                name,
            }) as Package;

        it("should map catalog changes to affected packages", () => {
            expect.assertions(2);

            const packages: Package[] = [
                createMockPackage("package-a", { "semantic-release": "catalog:cli" }),
                createMockPackage("package-b", { "@semantic-release/changelog": "catalog:cli" }),
                createMockPackage("package-c", { "lodash-es": "catalog:prod" }),
            ];

            const catalogChanges = {
                cli: {
                    "semantic-release": {
                        newVersion: "^25.0.0",
                        oldVersion: "^24.0.0",
                        releaseType: "major" as const,
                    },
                },
            };

            const affected = getAffectedPackagesFromCatalogChanges(packages, catalogChanges);

            expect(affected.size).toBe(1);
            expect(affected.get("package-a")).toBe("major");
        });

        it("should use highest severity when package affected by multiple changes", () => {
            expect.assertions(1);

            const packages: Package[] = [
                createMockPackage("package-a", {
                    "lodash-es": "catalog:prod",
                    "semantic-release": "catalog:cli",
                }),
            ];

            const catalogChanges = {
                cli: {
                    "semantic-release": {
                        newVersion: "^24.1.0",
                        oldVersion: "^24.0.0",
                        releaseType: "minor" as const,
                    },
                },
                prod: {
                    "lodash-es": {
                        newVersion: "^5.0.0",
                        oldVersion: "^4.17.0",
                        releaseType: "major" as const,
                    },
                },
            };

            const affected = getAffectedPackagesFromCatalogChanges(packages, catalogChanges);

            expect(affected.get("package-a")).toBe("major");
        });

        it("should handle packages not affected by catalog changes", () => {
            expect.assertions(2);

            const packages: Package[] = [
                createMockPackage("package-a", { "semantic-release": "catalog:cli" }),
                createMockPackage("package-b", { "some-package": "^1.0.0" }),
            ];

            const catalogChanges = {
                cli: {
                    "semantic-release": {
                        newVersion: "^25.0.0",
                        oldVersion: "^24.0.0",
                        releaseType: "major" as const,
                    },
                },
            };

            const affected = getAffectedPackagesFromCatalogChanges(packages, catalogChanges);

            expect(affected.size).toBe(1);
            expect(affected.has("package-b")).toBe(false);
        });
    });

    describe("integration with pnpm workspace catalogs", () => {
        it("should detect catalog changes in real pnpm workspace", async () => {
            expect.assertions(8);

            const cwd = gitInit();

            copyDirectory(`${fixturesPath}/pnpmWorkspaceCatalogs/`, cwd);

            const initialSha = gitCommitAll(cwd, "feat: initial commit with catalogs");

            // Update catalog versions
            const catalogPath = resolve(cwd, "pnpm-workspace.yaml");

            writeFileSync(
                catalogPath,
                `packages:
    - "packages/*"

catalogs:
    cli:
        semantic-release: ^25.0.0
        "@semantic-release/changelog": ^6.0.0
    dev:
        typescript: ^5.1.0
        eslint: ^9.0.0
    prod:
        lodash-es: ^4.18.0
`,
            );

            gitCommitAll(cwd, "chore: update catalog versions");

            const changes = await detectCatalogChanges(cwd, initialSha);

            expect(changes).toHaveProperty("cli");
            expect(changes).toHaveProperty("dev");
            expect(changes).toHaveProperty("prod");
            expect(changes.cli?.["semantic-release"]?.releaseType).toBe("major");
            expect(changes.cli?.["@semantic-release/changelog"]?.releaseType).toBe("major");
            expect(changes.dev?.["typescript"]?.releaseType).toBe("minor");
            expect(changes.dev?.["eslint"]?.releaseType).toBe("major");
            expect(changes.prod?.["lodash-es"]?.releaseType).toBe("minor");
        });
    });
});

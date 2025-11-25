import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { WritableStreamBuffer } from "stream-buffers";
import { beforeEach, describe, expect, it, vi } from "vitest";

// eslint-disable-next-line import/no-namespace
import * as getConfigSemanticModule from "../src/get-config-semantic";
import multiSemanticRelease from "../src/multi-semantic-release";
import { gitAdd, gitCommit, gitInit, gitInitOrigin, gitPush } from "./helpers/git";

describe("repository URL normalization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should normalize git+https:// repository URL from package.json string format", async () => {
        expect.assertions(1);

        // Create Git repo
        const cwd = gitInit();

        // Create a package.json with git+https:// repository URL
        const packageJsonPath = join(cwd, "package.json");
        const packageJson = {
            name: "test-package",
            repository: "git+https://github.com/anolilab/semantic-release.git",
            version: "1.0.0",
        };

        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        // Create a minimal .releaserc.json
        const releasercPath = join(cwd, ".releaserc.json");
        const releaserc = {
            branches: ["main"],
            plugins: ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
        };

        writeFileSync(releasercPath, JSON.stringify(releaserc, null, 2));

        gitAdd(cwd, ".");
        gitCommit(cwd, "feat: Initial commit");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Spy on getConfigSemantic to capture the options
        let capturedOptions: Record<string, unknown> | undefined;

        const getConfigSemanticSpy = vi
            .spyOn(getConfigSemanticModule, "default")
            .mockImplementation(async (_context: unknown, options: Record<string, unknown>) => {
                capturedOptions = options;

                // Return a mock response to avoid calling semantic-release's actual getConfig
                return {
                    options: {
                        ...options,
                        branches: ["main"],
                    },
                    plugins: {},
                };
            });

        try {
            // Capture output
            const stdout = new WritableStreamBuffer();
            const stderr = new WritableStreamBuffer();

            // Call multiSemanticRelease - this will fail because we're mocking, but we just need to verify the options
            try {
                await multiSemanticRelease([packageJsonPath], {}, { cwd, env: {}, stderr, stdout });
            } catch {
                // Expected to fail, we're just checking the options passed
            }

            // Verify that repositoryUrl was normalized (git+https:// removed)
            expect(capturedOptions?.repositoryUrl).toBe("https://github.com/anolilab/semantic-release.git");
        } finally {
            getConfigSemanticSpy.mockRestore();
        }
    });

    it("should normalize git+https:// repository URL from package.json object format", async () => {
        expect.assertions(1);

        // Create Git repo
        const cwd = gitInit();

        // Create a package.json with git+https:// repository URL in object format
        const packageJsonPath = join(cwd, "package.json");
        const packageJson = {
            name: "test-package",
            repository: {
                type: "git",
                url: "git+https://github.com/anolilab/semantic-release.git",
            },
            version: "1.0.0",
        };

        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        // Create a minimal .releaserc.json
        const releasercPath = join(cwd, ".releaserc.json");
        const releaserc = {
            branches: ["main"],
            plugins: ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
        };

        writeFileSync(releasercPath, JSON.stringify(releaserc, null, 2));

        gitAdd(cwd, ".");
        gitCommit(cwd, "feat: Initial commit");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Spy on getConfigSemantic to capture the options
        let capturedOptions: Record<string, unknown> | undefined;

        const getConfigSemanticSpy = vi
            .spyOn(getConfigSemanticModule, "default")
            .mockImplementation(async (_context: unknown, options: Record<string, unknown>) => {
                capturedOptions = options;

                // Return a mock response to avoid calling semantic-release's actual getConfig
                return {
                    options: {
                        ...options,
                        branches: ["main"],
                    },
                    plugins: {},
                };
            });

        try {
            // Capture output
            const stdout = new WritableStreamBuffer();
            const stderr = new WritableStreamBuffer();

            // Call multiSemanticRelease - this will fail because we're mocking, but we just need to verify the options
            try {
                await multiSemanticRelease([packageJsonPath], {}, { cwd, env: {}, stderr, stdout });
            } catch {
                // Expected to fail, we're just checking the options passed
            }

            // Verify that repositoryUrl was normalized (git+https:// removed)
            expect(capturedOptions?.repositoryUrl).toBe("https://github.com/anolilab/semantic-release.git");
        } finally {
            getConfigSemanticSpy.mockRestore();
        }
    });

    it("should normalize git+ssh:// repository URL from package.json", async () => {
        expect.assertions(1);

        // Create Git repo
        const cwd = gitInit();

        // Create a package.json with git+ssh:// repository URL
        const packageJsonPath = join(cwd, "package.json");
        const packageJson = {
            name: "test-package",
            repository: "git+ssh://git@github.com/anolilab/semantic-release.git",
            version: "1.0.0",
        };

        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        // Create a minimal .releaserc.json
        const releasercPath = join(cwd, ".releaserc.json");
        const releaserc = {
            branches: ["main"],
            plugins: ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
        };

        writeFileSync(releasercPath, JSON.stringify(releaserc, null, 2));

        gitAdd(cwd, ".");
        gitCommit(cwd, "feat: Initial commit");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Spy on getConfigSemantic to capture the options
        let capturedOptions: Record<string, unknown> | undefined;

        const getConfigSemanticSpy = vi
            .spyOn(getConfigSemanticModule, "default")
            .mockImplementation(async (_context: unknown, options: Record<string, unknown>) => {
                capturedOptions = options;

                // Return a mock response to avoid calling semantic-release's actual getConfig
                return {
                    options: {
                        ...options,
                        branches: ["main"],
                    },
                    plugins: {},
                };
            });

        try {
            // Capture output
            const stdout = new WritableStreamBuffer();
            const stderr = new WritableStreamBuffer();

            // Call multiSemanticRelease - this will fail because we're mocking, but we just need to verify the options
            try {
                await multiSemanticRelease([packageJsonPath], {}, { cwd, env: {}, stderr, stdout });
            } catch {
                // Expected to fail, we're just checking the options passed
            }

            // Verify that repositoryUrl was normalized (git+ssh:// removed)
            expect(capturedOptions?.repositoryUrl).toBe("ssh://git@github.com/anolilab/semantic-release.git");
        } finally {
            getConfigSemanticSpy.mockRestore();
        }
    });

    it("should not modify repositoryUrl if already set in options", async () => {
        expect.assertions(1);

        // Create Git repo
        const cwd = gitInit();

        // Create a package.json with git+https:// repository URL
        const packageJsonPath = join(cwd, "package.json");
        const packageJson = {
            name: "test-package",
            repository: "git+https://github.com/anolilab/semantic-release.git",
            version: "1.0.0",
        };

        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        // Create a minimal .releaserc.json with explicit repositoryUrl
        const releasercPath = join(cwd, ".releaserc.json");
        const releaserc = {
            branches: ["main"],
            plugins: ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
            repositoryUrl: "https://custom-repo.com/repo.git",
        };

        writeFileSync(releasercPath, JSON.stringify(releaserc, null, 2));

        gitAdd(cwd, ".");
        gitCommit(cwd, "feat: Initial commit");
        gitInitOrigin(cwd);
        gitPush(cwd);

        // Spy on getConfigSemantic to capture the options
        let capturedOptions: Record<string, unknown> | undefined;

        const getConfigSemanticSpy = vi
            .spyOn(getConfigSemanticModule, "default")
            .mockImplementation(async (_context: unknown, options: Record<string, unknown>) => {
                capturedOptions = options;

                // Return a mock response to avoid calling semantic-release's actual getConfig
                return {
                    options: {
                        ...options,
                        branches: ["main"],
                    },
                    plugins: {},
                };
            });

        try {
            // Capture output
            const stdout = new WritableStreamBuffer();
            const stderr = new WritableStreamBuffer();

            // Call multiSemanticRelease - this will fail because we're mocking, but we just need to verify the options
            try {
                await multiSemanticRelease([packageJsonPath], {}, { cwd, env: {}, stderr, stdout });
            } catch {
                // Expected to fail, we're just checking the options passed
            }

            // Verify that the explicit repositoryUrl from config is used, not the one from package.json
            expect(capturedOptions?.repositoryUrl).toBe("https://custom-repo.com/repo.git");
        } finally {
            getConfigSemanticSpy.mockRestore();
        }
    });
});

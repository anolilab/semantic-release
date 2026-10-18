import { describe, expect, it, vi } from "vitest";

import logger from "../../src/logger";
import normalizeRootFilesOptions from "../../src/utils/normalize-root-files-options";

describe("normalizeRootFilesOptions()", () => {
    it("should move the deprecated flat options into rootFiles and warn about each", () => {
        expect.assertions(3);

        const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

        const options = normalizeRootFilesOptions({
            dryRun: true,
            rootFilesPackages: ["web"],
            rootFilesReleaseType: "inherit",
            rootFilesScope: "affected",
            triggerRootFiles: ["pnpm-lock.yaml"],
        });

        expect(options).toStrictEqual({
            dryRun: true,
            rootFiles: { files: ["pnpm-lock.yaml"], packages: ["web"], release: "inherit", scope: "affected" },
        });
        expect(warn).toHaveBeenCalledTimes(4);
        expect(warn).toHaveBeenCalledWith(
            '[multi-semantic-release]: "triggerRootFiles" (--trigger-root-files) is deprecated, use "rootFiles.files" (--root-files.files) instead.',
        );

        warn.mockRestore();
    });

    it("should let rootFiles options win over the deprecated flat ones", () => {
        expect.assertions(1);

        const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

        expect(normalizeRootFilesOptions({ rootFiles: { scope: "all" }, rootFilesScope: "affected", triggerRootFiles: [".npmrc"] })).toStrictEqual({
            rootFiles: { files: [".npmrc"], scope: "all" },
        });

        warn.mockRestore();
    });

    it("should keep options without deprecated flat options as they are", () => {
        expect.assertions(1);

        const options = { rootFiles: { files: ["pnpm-lock.yaml"] } };

        expect(normalizeRootFilesOptions(options)).toBe(options);
    });
});

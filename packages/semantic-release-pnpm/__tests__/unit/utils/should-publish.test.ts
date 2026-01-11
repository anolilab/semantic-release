import type { PackageJson } from "@visulima/package";
import { describe, expect, it } from "vitest";

import type { PluginConfig } from "../../../src/definitions/plugin-config";
import { reasonToNotPublish, shouldPublish } from "../../../src/utils/should-publish";

describe(reasonToNotPublish, () => {
    it('should return "npmPublish plugin option is false" when npmPublish is false', () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: false };
        const packageJson: PackageJson = { name: "test-package" };

        const result = reasonToNotPublish(pluginConfig, packageJson);

        expect(result).toBe("npmPublish plugin option is false");
    });

    it('should return "package is private and has no workspaces" when package is private and has no workspaces', () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: true };
        const packageJson: PackageJson = { name: "test-package", private: true };

        const result = reasonToNotPublish(pluginConfig, packageJson);

        expect(result).toBe("package is private and has no workspaces");
    });

    it("should return null when npmPublish is true, package is not private, and has no workspaces", () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: true };
        const packageJson: PackageJson = { name: "test-package" };

        const result = reasonToNotPublish(pluginConfig, packageJson);

        expect(result).toBeNull();
    });

    it("should return null when package is private but has workspaces", () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: true };
        const packageJson: PackageJson = { name: "test-package", private: true, workspaces: ["packages/*"] };

        const result = reasonToNotPublish(pluginConfig, packageJson);

        expect(result).toBeNull();
    });
});

describe(shouldPublish, () => {
    it("should return false when npmPublish is false", () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: false };
        const packageJson: PackageJson = { name: "test-package" };

        const result = shouldPublish(pluginConfig, packageJson);

        expect(result).toBe(false);
    });

    it("should return false when package is private and has no workspaces", () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: true };
        const packageJson: PackageJson = { name: "test-package", private: true };

        const result = shouldPublish(pluginConfig, packageJson);

        expect(result).toBe(false);
    });

    it("should return true when npmPublish is true, package is not private, and has no workspaces", () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: true };
        const packageJson: PackageJson = { name: "test-package" };

        const result = shouldPublish(pluginConfig, packageJson);

        expect(result).toBe(true);
    });

    it("should return true when package is private but has workspaces", () => {
        expect.assertions(1);

        const pluginConfig: PluginConfig = { npmPublish: true };
        const packageJson: PackageJson = { name: "test-package", private: true, workspaces: ["packages/*"] };

        const result = shouldPublish(pluginConfig, packageJson);

        expect(result).toBe(true);
    });
});

import type SemanticReleaseError from "@semantic-release/error";
import { describe, expect, it } from "vitest";

import type { PluginConfig } from "../../../src/definitions/plugin-config";
import verifyConfig from "../../../src/verify/verify-config";

describe("verify-config", () => {
    it("verify \"npmPublish\", \"tarballDir\" and \"pkgRoot\" options", () => {
        expect.assertions(1);

        expect(verifyConfig({ npmPublish: true, pkgRoot: "dist", tarballDir: "release" })).toStrictEqual([]);
    });

    it("return SemanticReleaseError if \"npmPublish\" option is not a Boolean", () => {
        expect.assertions(3);

        const npmPublish = 42;
        const [error, ...errors] = verifyConfig({ npmPublish } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect((error as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error as SemanticReleaseError).code).toBe("EINVALIDNPMPUBLISH");
    });

    it("accept \"tarballDir\" option set to false", () => {
        expect.assertions(1);

        expect(verifyConfig({ tarballDir: false })).toStrictEqual([]);
    });

    it("return SemanticReleaseError if \"tarballDir\" option is not a String or false", () => {
        expect.assertions(3);

        // eslint-disable-next-line unicorn/prevent-abbreviations
        const tarballDir = 42;
        const [error, ...errors] = verifyConfig({ tarballDir } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect((error as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error as SemanticReleaseError).code).toBe("EINVALIDTARBALLDIR");
    });

    it("return SemanticReleaseError if \"pkgRoot\" option is not a String", () => {
        expect.assertions(3);

        const packageRoot = 42;
        const [error, ...errors] = verifyConfig({ pkgRoot: packageRoot } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect((error as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error as SemanticReleaseError).code).toBe("EINVALIDPKGROOT");
    });

    it("return SemanticReleaseError if \"publishBranch\" option is not a String", () => {
        expect.assertions(3);

        const publishBranch = 42;
        const [error, ...errors] = verifyConfig({ publishBranch } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect((error as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error as SemanticReleaseError).code).toBe("EINVALIDPUBLISHBRANCH");
    });

    it("return SemanticReleaseError Array if multiple config are invalid", () => {
        expect.assertions(8);

        const npmPublish = 42;
        // eslint-disable-next-line unicorn/prevent-abbreviations
        const tarballDir = 42;
        const packageRoot = 42;
        const publishBranch = 42;
        const [error1, error2, error3, error4] = verifyConfig({ npmPublish, pkgRoot: packageRoot, publishBranch, tarballDir } as unknown as PluginConfig);

        expect((error1 as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error1 as SemanticReleaseError).code).toBe("EINVALIDNPMPUBLISH");

        expect((error2 as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error2 as SemanticReleaseError).code).toBe("EINVALIDPKGROOT");

        expect((error3 as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error3 as SemanticReleaseError).code).toBe("EINVALIDPUBLISHBRANCH");

        expect((error4 as SemanticReleaseError).name).toBe("SemanticReleaseError");
        expect((error4 as SemanticReleaseError).code).toBe("EINVALIDTARBALLDIR");
    });
});

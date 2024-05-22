import { describe, expect, it } from "vitest";

import type { PluginConfig } from "../../../src/definitions/plugin-config";
import verifyConfig from "../../../src/verify/verify-config";

describe("verify-config", () => {
    it('verify "npmPublish", "tarballDir" and "pkgRoot" options', async () => {
        expect.assertions(1);

        expect(verifyConfig({ npmPublish: true, pkgRoot: "dist", tarballDir: "release" })).toStrictEqual([]);
    });

    it('return SemanticReleaseError if "npmPublish" option is not a Boolean', async () => {
        expect.assertions(3);

        const npmPublish = 42;
        const [error, ...errors] = verifyConfig({ npmPublish } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect(error!.name).toBe("SemanticReleaseError");
        expect(error!.code).toBe("EINVALIDNPMPUBLISH");
    });

    it('return SemanticReleaseError if "tarballDir" option is not a String', async () => {
        expect.assertions(3);

        // eslint-disable-next-line unicorn/prevent-abbreviations
        const tarballDir = 42;
        const [error, ...errors] = verifyConfig({ tarballDir } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect(error!.name).toBe("SemanticReleaseError");
        expect(error!.code).toBe("EINVALIDTARBALLDIR");
    });

    it('return SemanticReleaseError if "pkgRoot" option is not a String', async () => {
        expect.assertions(3);

        const packageRoot = 42;
        const [error, ...errors] = verifyConfig({ pkgRoot: packageRoot } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect(error!.name).toBe("SemanticReleaseError");
        expect(error!.code).toBe("EINVALIDPKGROOT");
    });

    it('return SemanticReleaseError if "publishBranch" option is not a String', async () => {
        expect.assertions(3);

        const publishBranch = 42;
        const [error, ...errors] = verifyConfig({ publishBranch } as unknown as PluginConfig);

        expect(errors).toHaveLength(0);
        expect(error!.name).toBe("SemanticReleaseError");
        expect(error!.code).toBe("EINVALIDPUBLISHBRANCH");
    });

    it("return SemanticReleaseError Array if multiple config are invalid", async () => {
        expect.assertions(8);

        const npmPublish = 42;
        // eslint-disable-next-line unicorn/prevent-abbreviations
        const tarballDir = 42;
        const packageRoot = 42;
        const publishBranch = 42;
        const [error1, error2, error3, error4] = verifyConfig({ npmPublish, pkgRoot: packageRoot, publishBranch, tarballDir } as unknown as PluginConfig);

        expect(error1!.name).toBe("SemanticReleaseError");
        expect(error1!.code).toBe("EINVALIDNPMPUBLISH");

        expect(error2!.name).toBe("SemanticReleaseError");
        expect(error2!.code).toBe("EINVALIDPKGROOT");

        expect(error3!.name).toBe("SemanticReleaseError");
        expect(error3!.code).toBe("EINVALIDPUBLISHBRANCH");

        expect(error4!.name).toBe("SemanticReleaseError");
        expect(error4!.code).toBe("EINVALIDTARBALLDIR");
    });
});

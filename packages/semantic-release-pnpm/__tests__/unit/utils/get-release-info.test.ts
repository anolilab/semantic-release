import { describe, expect, it } from "vitest";

import { OFFICIAL_REGISTRY } from "../../../src/definitions/constants";
import type { PublishContext } from "../../../src/definitions/context";
import { getReleaseInfo } from "../../../src/utils/get-release-info";

describe(getReleaseInfo, () => {
    it("default registry and scoped module", async () => {
        expect.assertions(1);

        expect(
            getReleaseInfo({ name: "@scope/module" }, { env: {}, nextRelease: { version: "1.0.0" } } as PublishContext, "latest", OFFICIAL_REGISTRY),
        ).toStrictEqual({
            channel: "latest",
            name: "pnpm package (@latest dist-tag)",
            url: "https://www.npmjs.com/package/@scope/module/v/1.0.0",
        });
    });

    it("custom registry and scoped module", async () => {
        expect.assertions(1);

        expect(
            getReleaseInfo(
                { name: "@scope/module" },
                { env: {}, nextRelease: { version: "1.0.0" } } as PublishContext,
                "latest",
                "https://custom.registry.org/",
            ),
        ).toStrictEqual({
            channel: "latest",
            name: "pnpm package (@latest dist-tag)",
            url: undefined,
        });
    });
});

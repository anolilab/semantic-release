import { describe, expect, it } from "vitest";

import getChannel from "../../../src/utils/get-channel";

describe(getChannel, () => {
    it("get default channel", () => {
        expect.assertions(1);

        expect(getChannel(undefined)).toBe("latest");
    });

    it("get passed channel if valid", () => {
        expect.assertions(1);

        expect(getChannel("next")).toBe("next");
    });

    it("prefix channel with \"release-\" if invalid", () => {
        expect.assertions(2);

        expect(getChannel("1.x")).toBe("release-1.x");
        expect(getChannel("1.0.0")).toBe("release-1.0.0");
    });
});

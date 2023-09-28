import { describe, expect, it } from "vitest";

import mergeConfig from "../../../lib/utils/merge-config.js";

describe("mergeConfig", () => {
    it("should return default values for empty configs", () => {
        const result = mergeConfig();

        expect(result).toStrictEqual({ deps: {}, ignorePackages: [] });
    });

    it("should merge when one config is empty", () => {
        const a = { deps: { lodash: "^4.0.0" }, foo: "bar" };
        const result = mergeConfig(a);

        expect(result).toStrictEqual({ deps: { lodash: "^4.0.0" }, foo: "bar", ignorePackages: [] });
    });

    it("should merge without overlapping keys", () => {
        const a = { foo: "bar" };
        const b = { baz: "qux" };
        const result = mergeConfig(a, b);

        expect(result).toStrictEqual({ baz: "qux", deps: {}, foo: "bar", ignorePackages: [] });
    });

    it("should merge with overlapping keys", () => {
        const a = { deps: { lodash: "^4.0.0" }, foo: "bar" };
        const b = { deps: { react: "^17.0.0" }, foo: "qux" };
        const result = mergeConfig(a, b);

        expect(result).toStrictEqual({ deps: { lodash: "^4.0.0", react: "^17.0.0" }, foo: "qux", ignorePackages: [] });
    });

    it("should handle null and undefined values", () => {
        const a = { bar: undefined, foo: null };
        const b = { bara: undefined, foo: "baz", fooa: null, qux: "quux" };
        const result = mergeConfig(a, b);

        expect(result).toStrictEqual({ deps: {}, foo: "baz", ignorePackages: [], qux: "quux" });
    });

    it("should merge nested deps objects", () => {
        const a = { deps: { lodash: "^4.0.0", react: "^16.0.0" } };
        const b = { deps: { react: "^17.0.0", vue: "^3.0.0" } };
        const result = mergeConfig(a, b);

        expect(result).toStrictEqual({ deps: { lodash: "^4.0.0", react: "^17.0.0", vue: "^3.0.0" }, ignorePackages: [] });
    });

    it("should merge ignorePackages arrays", () => {
        const a = { ignorePackages: ["lodash"] };
        const b = { ignorePackages: ["react", "lodash"] };
        const result = mergeConfig(a, b);

        expect(result).toStrictEqual({ deps: {}, ignorePackages: ["lodash", "react"] });
    });
});

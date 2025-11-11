import { describe, expect, it } from "vitest";

import cleanPath from "../../src/utils/clean-path";
import transformPath from "../helpers/transform-path";

describe("cleanPath()", () => {
    it("relative without CWD", () => {
        expect.assertions(2);

        expect(cleanPath("aaa")).toBe(transformPath(`${process.cwd()}/aaa`));
        expect(cleanPath("aaa/")).toBe(transformPath(`${process.cwd()}/aaa`));
    });

    it("relative with CWD", () => {
        expect.assertions(2);

        expect(cleanPath("ccc", "/a/b/")).toBe(transformPath(`/a/b/ccc`));
        expect(cleanPath("ccc", "/a/b")).toBe(transformPath(`/a/b/ccc`));
    });

    it("absolute without CWD", () => {
        expect.assertions(4);

        expect(cleanPath("/aaa")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/aaa/")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/a/b/c")).toBe(transformPath(`/a/b/c`));
        expect(cleanPath("/a/b/c/")).toBe(transformPath(`/a/b/c`));
    });

    it("absolute with CWD", () => {
        expect.assertions(4);

        expect(cleanPath("/aaa", "/x/y/z")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/aaa/", "/x/y/z")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/a/b/c", "/x/y/z")).toBe(transformPath(`/a/b/c`));
        expect(cleanPath("/a/b/c/", "/x/y/z")).toBe(transformPath(`/a/b/c`));
    });
});

import { describe, expect, it } from "vitest";

import cleanPath from "../../../lib/utils/clean-path.js";
import transformPath from "../../helpers/transform-path.js";

describe("cleanPath()", () => {
    it("relative without CWD", () => {
        expect(cleanPath("aaa")).toBe(transformPath(`${process.cwd()}/aaa`));
        expect(cleanPath("aaa/")).toBe(transformPath(`${process.cwd()}/aaa`));
    });

    it("relative with CWD", () => {
        expect(cleanPath("ccc", "/a/b/")).toBe(transformPath(`/a/b/ccc`));
        expect(cleanPath("ccc", "/a/b")).toBe(transformPath(`/a/b/ccc`));
    });

    it("absolute without CWD", () => {
        expect(cleanPath("/aaa")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/aaa/")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/a/b/c")).toBe(transformPath(`/a/b/c`));
        expect(cleanPath("/a/b/c/")).toBe(transformPath(`/a/b/c`));
    });

    it("absolute with CWD", () => {
        expect(cleanPath("/aaa", "/x/y/z")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/aaa/", "/x/y/z")).toBe(transformPath(`/aaa`));
        expect(cleanPath("/a/b/c", "/x/y/z")).toBe(transformPath(`/a/b/c`));
        expect(cleanPath("/a/b/c/", "/x/y/z")).toBe(transformPath(`/a/b/c`));
    });
});

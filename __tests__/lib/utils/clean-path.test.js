import { describe, expect, it } from "vitest";

import cleanPath from "../../../lib/utils/clean-path.js";

// Tests.
describe("cleanPath()", () => {
    it("relative without CWD", () => {
        expect(cleanPath("aaa")).toBe(`${process.cwd()}/aaa`);
        expect(cleanPath("aaa/")).toBe(`${process.cwd()}/aaa`);
    });
    it("relative with CWD", () => {
        expect(cleanPath("ccc", "/a/b/")).toBe(`/a/b/ccc`);
        expect(cleanPath("ccc", "/a/b")).toBe(`/a/b/ccc`);
    });
    it("absolute without CWD", () => {
        expect(cleanPath("/aaa")).toBe(`/aaa`);
        expect(cleanPath("/aaa/")).toBe(`/aaa`);
        expect(cleanPath("/a/b/c")).toBe(`/a/b/c`);
        expect(cleanPath("/a/b/c/")).toBe(`/a/b/c`);
    });
    it("absolute with CWD", () => {
        expect(cleanPath("/aaa", "/x/y/z")).toBe(`/aaa`);
        expect(cleanPath("/aaa/", "/x/y/z")).toBe(`/aaa`);
        expect(cleanPath("/a/b/c", "/x/y/z")).toBe(`/a/b/c`);
        expect(cleanPath("/a/b/c/", "/x/y/z")).toBe(`/a/b/c`);
    });
});

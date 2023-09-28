import { describe, expect, it } from "vitest";

import cleanPath from "../../../lib/utils/clean-path.js";

const isWindows = process.platform === "win32";

const transform = (path) => (isWindows ? path.replaceAll("/", "\\") : path);

describe("cleanPath()", () => {
    it("relative without CWD", () => {
        expect(cleanPath("aaa")).toBe(transform(`${process.cwd()}/aaa`));
        expect(cleanPath("aaa/")).toBe(transform(`${process.cwd()}/aaa`));
    });

    it("relative with CWD", () => {
        expect(cleanPath("ccc", "/a/b/")).toBe(transform(`/a/b/ccc`));
        expect(cleanPath("ccc", "/a/b")).toBe(transform(`/a/b/ccc`));
    });

    it("absolute without CWD", () => {
        expect(cleanPath("/aaa")).toBe(transform(`/aaa`));
        expect(cleanPath("/aaa/")).toBe(transform(`/aaa`));
        expect(cleanPath("/a/b/c")).toBe(transform(`/a/b/c`));
        expect(cleanPath("/a/b/c/")).toBe(transform(`/a/b/c`));
    });

    it("absolute with CWD", () => {
        expect(cleanPath("/aaa", "/x/y/z")).toBe(transform(`/aaa`));
        expect(cleanPath("/aaa/", "/x/y/z")).toBe(transform(`/aaa`));
        expect(cleanPath("/a/b/c", "/x/y/z")).toBe(transform(`/a/b/c`));
        expect(cleanPath("/a/b/c/", "/x/y/z")).toBe(transform(`/a/b/c`));
    });
});

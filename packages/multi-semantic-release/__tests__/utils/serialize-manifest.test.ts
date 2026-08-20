import { describe, expect, it } from "vitest";

// The helper is shared with the other packages of this repository and bundled into each of them,
// so it is covered here on behalf of all of them.
import serializeManifest from "../../../../shared/serialize-manifest";

describe("serializeManifest()", () => {
    describe("indentation", () => {
        it("should keep tab indentation", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b", c: { d: "e" } }, `{\n\t"a": "b",\n\t"c": {\n\t\t"d": "e"\n\t}\n}`)).toBe(
                `{\n\t"a": "b",\n\t"c": {\n\t\t"d": "e"\n\t}\n}`,
            );
        });

        it("should keep a manifest without indentation compact", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" }, `{"a": "b"}`)).toBe(`{"a":"b"}`);
        });

        it("should fall back to two spaces and a trailing newline without original contents", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" })).toBe(`{\n  "a": "b"\n}\n`);
        });
    });

    describe("trailing newline", () => {
        it("should add none when the original had none", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" }, `{"a": "b"}`)).toBe(`{"a":"b"}`);
        });

        it("should keep a single trailing newline", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" }, `{"a": "b"}\n`)).toBe(`{"a":"b"}\n`);
        });

        it("should collapse multiple trailing newlines into one", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" }, `{"a": "b"}\n\n`)).toBe(`{"a":"b"}\n`);
        });
    });

    describe("line endings", () => {
        it("should keep CRLF line endings", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" }, `{\r\n  "a": "b"\r\n}\r\n`)).toBe(`{\r\n  "a": "b"\r\n}\r\n`);
        });

        it("should keep LF line endings", () => {
            expect.assertions(1);

            expect(serializeManifest({ a: "b" }, `{\n  "a": "b"\n}\n`)).toBe(`{\n  "a": "b"\n}\n`);
        });
    });
});

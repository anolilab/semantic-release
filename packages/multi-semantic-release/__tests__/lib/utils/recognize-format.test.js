import { describe, expect, it } from "vitest";

import recognizeFormat from "../../../lib/utils/recognize-format.js";

describe("recognizeFormat()", () => {
    describe("indentation", () => {
        it("normal indentation", () => {
            expect.assertions(1);

            expect(
                recognizeFormat(`{
	"a": "b",
	"c": {
		"d": "e"
	}
}`).indent,
            ).toBe("\t");
        });

        it("no indentation", () => {
            expect.assertions(1);

            expect(recognizeFormat("{\"a\": \"b\"}").indent).toBe("");
        });
    });

    describe("trailing whitespace", () => {
        it("no trailing whitespace", () => {
            expect.assertions(1);

            expect(recognizeFormat("{\"a\": \"b\"}").trailingWhitespace).toBe("");
        });

        it("newline", () => {
            expect.assertions(1);

            expect(recognizeFormat("{\"a\": \"b\"}\n").trailingWhitespace).toBe("\n");
        });

        it("multiple newlines", () => {
            expect.assertions(1);

            expect(recognizeFormat("{\"a\": \"b\"}\n\n").trailingWhitespace).toBe("\n");
        });
    });
});

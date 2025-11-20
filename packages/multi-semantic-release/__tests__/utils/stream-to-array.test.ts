import { createReadStream, unlinkSync, writeFileSync } from "node:fs";
import { nextTick } from "node:process";
import { PassThrough, Readable } from "node:stream";

import { temporaryFile } from "tempy";
import { describe, expect, it } from "vitest";

import streamToArray from "../../src/utils/stream-to-array";

type Stream = NodeJS.ReadableStream;

const emptyStream = (): Stream => {
    const stream = new PassThrough();

    nextTick(() => {
        stream.emit("end");
    });

    return stream;
};

const closedStream = (): Stream => {
    const stream = new Readable({
        read() {
            // Do nothing - stream should be closed
        },
    });

    nextTick(() => {
        stream.emit("close");
    });

    return stream;
};

describe("stream To Array", () => {
    it("should work", async () => {
        expect.assertions(2);

        // Create a temporary empty file for testing
        const temporaryFilePath = temporaryFile();

        writeFileSync(temporaryFilePath, "");

        try {
            const result = await streamToArray(createReadStream(temporaryFilePath));

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        } finally {
            // Clean up the temporary file
            try {
                unlinkSync(temporaryFilePath);
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    it("should work as a promise", async () => {
        expect.assertions(2);

        // Create a temporary empty file for testing
        const temporaryFilePath = temporaryFile();

        writeFileSync(temporaryFilePath, "");

        try {
            const array = await streamToArray(createReadStream(temporaryFilePath));

            expect(Array.isArray(array)).toBe(true);
            expect(array).toHaveLength(0);
        } finally {
            // Clean up the temporary file
            try {
                unlinkSync(temporaryFilePath);
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    it("should work as a promise with zalgo", async () => {
        expect.assertions(2);

        const array = await streamToArray(emptyStream());

        expect(Array.isArray(array)).toBe(true);
        expect(array).toHaveLength(0);
    });

    it("should work as a promise with chucky", async () => {
        expect.assertions(2);

        const array = await streamToArray(closedStream());

        expect(Array.isArray(array)).toBe(true);
        expect(array).toHaveLength(0);
    });
});

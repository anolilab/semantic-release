import { createReadStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { nextTick } from "node:process";
import { PassThrough, Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import streamToArray from "../../../lib/utils/stream-to-array.js";

const fixtureFile = resolve(dirname(fileURLToPath(import.meta.url)), "../../__fixtures__/badDepsPackage.json");

function emptyStream() {
    const stream = new PassThrough();

    nextTick(() => {
        stream.emit("end");
    });

    return stream;
}

function closedStream() {
    const stream = new Readable();

    stream._read = function read() {};

    process.nextTick(() => {
        stream.emit("close");
    });

    return stream;
}

describe("stream To Array", () => {
    it("should work", async () => {
        expect.assertions(2);

        const result = await streamToArray(createReadStream(fixtureFile));

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    // eslint-disable-next-line vitest/prefer-expect-assertions
    it("should work as a promise", () => {
        // eslint-disable-next-line promise/catch-or-return,promise/always-return
        streamToArray(createReadStream(fixtureFile)).then((array) => {
            expect.assertions(2);
            expect(Array.isArray(array)).toBeTruthy();
            expect(array).toHaveLength(0);
        });
    });

    // eslint-disable-next-line vitest/prefer-expect-assertions
    it("should work as a promise with zalgo", () => {
        // eslint-disable-next-line promise/catch-or-return,promise/always-return
        streamToArray(emptyStream()).then((array) => {
            expect.assertions(2);
            expect(Array.isArray(array)).toBeTruthy();
            expect(array).toHaveLength(0);
        });
    });

    // eslint-disable-next-line vitest/prefer-expect-assertions
    it("should work as a promise with chucky", () => {
        // eslint-disable-next-line promise/catch-or-return,promise/always-return
        streamToArray(closedStream()).then((array) => {
            expect.assertions(2);
            expect(Array.isArray(array)).toBeTruthy();
            expect(array).toHaveLength(0);
        });
    });
});

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

    stream._read = function () {};

    process.nextTick(() => {
        stream.emit("close");
    });

    return stream;
}

describe("stream To Array", () => {
    it("should work", async () => {
        const result = await streamToArray(createReadStream(fixtureFile));

        expect(Array.isArray(result)).toBeTruthy();
        expect(result).toHaveLength(0);
    });

    it("should work as a promise", () => {
        streamToArray(createReadStream(fixtureFile)).then((array) => {
            expect(Array.isArray(array)).toBeTruthy();
            expect(array).toHaveLength(0);
        });
    });

    it("should work as a promise with zalgo", () => {
        streamToArray(emptyStream()).then((array) => {
            expect(Array.isArray(array)).toBeTruthy();
            expect(array).toHaveLength(0);
        });
    });

    it("should work as a promise with chucky", () => {
        streamToArray(closedStream()).then((array) => {
            expect(Array.isArray(array)).toBeTruthy();
            expect(array).toHaveLength(0);
        });
    });
});

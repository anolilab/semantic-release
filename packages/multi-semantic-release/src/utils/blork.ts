import { existsSync, lstatSync } from "node:fs";
import { Writable } from "node:stream";

import { add, checker } from "blork";
import { WritableStreamBuffer } from "stream-buffers";

// Get some checkers.
const isAbsolute = checker("absolute");

// Add a directory checker.
add("directory", (v: string) => isAbsolute(v) && existsSync(v) && lstatSync(v).isDirectory(), "directory that exists in the filesystem");

// Add a writable stream checker.
add(
    "stream",
    // istanbul ignore next (not important)
    (v: unknown) => v instanceof Writable || v instanceof WritableStreamBuffer,
    "instance of stream.Writable or WritableStreamBuffer",
);

// eslint-disable-next-line simple-import-sort/exports
export { ValueError, check } from "blork";

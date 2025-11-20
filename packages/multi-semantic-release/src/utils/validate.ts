import { existsSync, lstatSync } from "node:fs";
import { isAbsolute as pathIsAbsolute } from "node:path";
import { Writable } from "node:stream";

import { WritableStreamBuffer } from "stream-buffers";

/**
 * Check if a value is a directory that exists in the filesystem.
 */
const isDirectory = (v: string): boolean => pathIsAbsolute(v) && existsSync(v) && lstatSync(v).isDirectory();

/**
 * Check if a value is a stream (Writable or WritableStreamBuffer).
 */
const isStream = (v: unknown): boolean => v instanceof Writable || v instanceof WritableStreamBuffer;

/**
 * Check if a value is an absolute path.
 */
const isAbsolute = (v: string): boolean => pathIsAbsolute(v);

/**
 * Check if a value is a path (string that could be absolute or relative).
 */
const isPath = (v: string): boolean => typeof v === "string" && v.length > 0;

/**
 * Check if a value is object-like (not null, not array, is object).
 */
const isObjectLike = (v: unknown): boolean => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Check if a value is a 40-character alphanumeric string (SHA).
 */
const isAlphanumeric40 = (v: string | undefined): boolean => {
    if (v === undefined) {
        return true; // Optional
    }

    return typeof v === "string" && /^[a-f0-9]{40}$/i.test(v);
};

/**
 * Check if a value is a non-empty string.
 */
const isStringPlus = (v: string): boolean => typeof v === "string" && v.length > 0;

/**
 * Check if a value is a kebab-case string.
 */
const isKebab = (v: string): boolean => typeof v === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

/**
 * Check if a value is a lowercase string.
 */
const isLower = (v: string): boolean => typeof v === "string" && v === v.toLowerCase();

/**
 * Check if a value is an integer.
 */
const isInteger = (v: number): boolean => Number.isInteger(v);

/**
 * Validate a value against a type specification.
 * @param value The value to validate.
 * @param typeString A string describing the expected type (e.g., "cwd: directory").
 * @throws {TypeError} If validation fails.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const validate = (value: unknown, typeString: string): void => {
    const [name, type] = typeString.split(":").map((s) => s.trim());
    const isOptional = type?.endsWith("?");
    const baseType = isOptional && type ? type.slice(0, -1) : type;

    // Handle optional values
    if (isOptional && (value === undefined || value === null)) {
        return;
    }

    // Handle array types (e.g., "string[]")
    if (baseType?.endsWith("[]")) {
        const elementType = baseType.slice(0, -2);

        if (!Array.isArray(value)) {
            throw new TypeError(`${name}: Must be an array`);
        }

        for (const item of value as unknown[]) {
            validate(item, `${name}[item]: ${elementType}`);
        }

        return;
    }

    // Handle specific type checks
    switch (baseType) {
        case "absolute": {
            if (!(typeof value === "string" && isAbsolute(value))) {
                throw new TypeError(`${name}: Must be an absolute path`);
            }

            break;
        }
        case "alphanumeric{40}": {
            if (!isAlphanumeric40(value as string | undefined)) {
                throw new TypeError(`${name}: Must be alphanumeric string with size 40 or empty`);
            }

            break;
        }
        case "directory": {
            if (!(typeof value === "string" && isDirectory(value))) {
                throw new TypeError(`${name}: Must be directory that exists in the filesystem`);
            }

            break;
        }
        case "integer": {
            if (!(typeof value === "number" && isInteger(value))) {
                throw new TypeError(`${name}: Must be an integer`);
            }

            break;
        }
        case "kebab": {
            if (!(typeof value === "string" && isKebab(value))) {
                throw new TypeError(`${name}: Must be a kebab-case string`);
            }

            break;
        }
        case "lower": {
            if (!(typeof value === "string" && isLower(value))) {
                throw new TypeError(`${name}: Must be a lowercase string`);
            }

            break;
        }
        case "objectlike": {
            if (!isObjectLike(value)) {
                throw new TypeError(`${name}: Must be an object`);
            }

            break;
        }
        case "path": {
            if (!(typeof value === "string" && isPath(value))) {
                throw new TypeError(`${name}: Must be valid path`);
            }

            break;
        }
        case "stream": {
            if (!isStream(value)) {
                throw new TypeError(`${name}: Must be an instance of stream.Writable or WritableStreamBuffer`);
            }

            break;
        }
        case "string": {
            if (typeof value !== "string") {
                throw new TypeError(`${name}: Must be a string`);
            }

            break;
        }
        case "string+": {
            if (!isStringPlus(value as string)) {
                throw new TypeError(`${name}: Must be a non-empty string`);
            }

            break;
        }
        default: {
            // Fallback: just check that value is not null/undefined
            if (value === null || value === undefined) {
                throw new TypeError(`${name}: Must not be null or undefined`);
            }
        }
    }
};

export { validate };
export { ValueError } from "../types";

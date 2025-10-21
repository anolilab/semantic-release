import detectIndent from "detect-indent";
import { detectNewline } from "detect-newline";

import type { FileFormat } from "../types";

/**
 * Information about the format of a file.
 * @typedef FileFormat
 * @property {string|number} indent Indentation characters
 * @property {string} trailingWhitespace Trailing whitespace at the end of the file
 */

/**
 * Detects the indentation and trailing whitespace of a file.
 * @param contents contents of the file
 * @returns Formatting of the file
 */
const recognizeFormat = (contents: string): FileFormat => {
    return {
        indent: detectIndent(contents).indent,
        trailingWhitespace: detectNewline(contents) || "",
    };
};

// Exports.
export default recognizeFormat;

import { detect as detectEol, format as formatEol, LF } from "@visulima/fs/eol";
import detectIndent from "detect-indent";

/** Indentation used when the original contents give nothing to go by — npm's default. */
const DEFAULT_INDENT = 2;

/**
 * Serialize a manifest in the layout of the file it came from: the same indentation, the same line
 * endings and a trailing newline only if the original had one. Writing the result back therefore
 * changes the `package.json` line the value lives on and nothing else — which keeps release commits
 * reviewable and avoids rewriting a CRLF manifest as LF.
 *
 * This file is shared between the packages of this repository and bundled into each of them by
 * packem; it is not published on its own.
 * @param data The manifest to serialize.
 * @param original The contents the manifest was read from. Pass nothing for a file that does not
 * exist yet, which is serialized with two spaces, LF and a trailing newline.
 * @returns The manifest as it should be written to disk.
 */
const serializeManifest = (data: unknown, original?: string): string => {
    if (!original) {
        return `${JSON.stringify(data, undefined, DEFAULT_INDENT)}${LF}`;
    }

    const eol = detectEol(original) ?? LF;
    const serialized = JSON.stringify(data, undefined, detectIndent(original).indent);

    return formatEol(serialized, eol) + (original.endsWith("\n") ? eol : "");
};

export default serializeManifest;

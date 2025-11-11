import { Writable } from "node:stream";

import { validate } from "./utils/validate";

/**
 * Create a stream that passes messages through while rewriting scope.
 * Replaces `[semantic-release]` with a custom scope (e.g. `[my-awesome-package]`) so output makes more sense.
 * @param stream The actual stream to write messages to.
 * @param scope The string scope for the stream (instances of the text `[semantic-release]` are replaced in the stream).
 * @returns Object that's compatible with stream.Writable (implements a `write()` property).
 * @internal
 */
class RescopedStream extends Writable {
    private _stream: NodeJS.WritableStream;

    private _scope: string;

    public constructor(stream: NodeJS.WritableStream, scope: string) {
        super();
        validate(scope, "scope: string");
        validate(stream, "stream: stream");
        this._stream = stream;
        this._scope = scope;
    }

    public write(message: string): void {
        validate(message, "msg: string");
        this._stream.write(message.replace("[semantic-release]", `[${this._scope}]`));
    }
}

export default RescopedStream;

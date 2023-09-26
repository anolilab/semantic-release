/**
 * Converts a stream to an array
 *
 * @param {ReadStream} stream
 * @returns {Promise<array>}
 */
export default function streamToArray(stream) {
    if (!stream.readable) {
        return Promise.resolve([]);
    }

    // eslint-disable-next-line compat/compat
    return new Promise((resolve, reject) => {
        // stream is already ended
        if (!stream.readable) {
            return resolve([]);
        }

        let array = [];

        function cleanup() {
            array = null;

            // eslint-disable-next-line no-use-before-define
            stream.removeListener("data", onData);
            // eslint-disable-next-line no-use-before-define
            stream.removeListener("end", onEnd);
            // eslint-disable-next-line no-use-before-define
            stream.removeListener("error", onError);
            // eslint-disable-next-line no-use-before-define
            stream.removeListener("close", onClose);
        }

        function onData(document_) {
            array.push(document_);
        }

        function onEnd() {
            resolve(array);
            cleanup();
        }

        function onError(error) {
            reject(error);
            cleanup();
        }

        function onClose() {
            resolve(array);
            cleanup();
        }

        stream.on("data", onData);
        stream.on("end", onEnd);
        stream.on("error", onEnd);
        stream.on("close", onClose);
    });
}

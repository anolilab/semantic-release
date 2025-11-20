/**
 * Converts a stream to an array.
 * @param stream The stream to convert.
 * @returns Promise that resolves to an array.
 */
const streamToArray = (stream: NodeJS.ReadableStream): Promise<unknown[]> => {
    if (!stream.readable) {
        return Promise.resolve([]);
    }

    return new Promise<unknown[]>((resolve, reject) => {
        // stream is already ended
        if (!stream.readable) {
            resolve([]);

            return;
        }

        let array: unknown[] = [];

        /**
         * Cleanup function to remove all listeners.
         */
        const cleanup = (): void => {
            array = [];

            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            stream.removeListener("data", onData);

            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            stream.removeListener("end", onEnd);

            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            stream.removeListener("error", onError);

            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            stream.removeListener("close", onClose);
        };

        /**
         * Handle data events.
         * @param document_ The data chunk.
         */
        const onData = (document_: unknown): void => {
            array.push(document_);
        };

        /**
         * Handle end events.
         */
        const onEnd = (): void => {
            resolve(array);
            cleanup();
        };

        /**
         * Handle error events.
         * @param error The error that occurred.
         */
        const onError = (error: Error): void => {
            reject(error);
            cleanup();
        };

        /**
         * Handle close events.
         */
        const onClose = (): void => {
            resolve(array);
            cleanup();
        };

        stream.on("data", onData);
        stream.on("end", onEnd);
        stream.on("error", onError);
        stream.on("close", onClose);
    });
};

export default streamToArray;

import { URL } from "node:url";

/**
 * Maps a URL to an identifier.
 *
 * The ISC License
 * Copyright (c) npm, Inc.
 *
 * Name courtesy schiffertronix media LLC, a New Jersey corporation
 *
 * @param {String} url The URL to be nerfed.
 *
 * @returns {String} A nerfed URL.
 */
const nerfDart = (url: string): string => {
    const parsed = new URL(url);
    const from = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const real = new URL(".", from);

    return `//${real.host}${real.pathname}`;
};

export default nerfDart;

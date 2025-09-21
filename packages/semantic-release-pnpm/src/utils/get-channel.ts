import { validRange } from "semver";

/**
 * Map a semantic-release `channel` value to the dist-tag that should be used when publishing to the
 * npm registry.
 *
 * If the provided channel is a valid semver range (`1.x`, `2&amp;#x2F;beta`, …) it will be prefixed with
 * `release-` to avoid clashes with the default tags like `latest` or `next` (mirrors the behaviour of
 * the official npm plugin). Otherwise the value is returned unchanged. When the channel is `null` or
 * `undefined` the function returns the default tag `latest`.
 * @param channel – The channel coming from `context.nextRelease.channel`.
 * @returns The npm dist-tag that should be used for the publish operation.
 */
export default (channel: string | null | undefined): string => (channel ? validRange(channel) ? `release-${channel}` : channel : "latest");

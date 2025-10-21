/* eslint-disable no-secrets/no-secrets, jsdoc/informative-docs */

import type { PackageJson } from "@visulima/package";
import normalizeUrl from "normalize-url";

import { OFFICIAL_REGISTRY } from "../definitions/constants";
import type { PublishContext } from "../definitions/context";

/**
 * Object returned to semantic-release that describes the artifact published or modified by the
 * plugin. This information is surfaced in the release notes.
 */
export interface ReleaseInfo {
    channel: string;
    name: string;
    url?: string;
}

/**
 * Build a {@link ReleaseInfo} object for a published package or newly added dist-tag.
 *
 * When the publish happened on the official npm registry, a direct URL to the version on npmjs.com is
 * included to make the release notes more useful. For custom registries the URL is omitted because a
 * standard pattern cannot be guaranteed.
 * @param pkg – The package manifest (used for the package name).
 * @param pkg.name The name of the package.
 * @param context Semantic-release publish context (provides version & env).
 * @param context.env The environment variables.
 * @param context.env.DEFAULT_NPM_REGISTRY The default npm registry.
 * @param context.nextRelease The next release.
 * @param context.nextRelease.version The version of the next release.
 * @param distributionTag The dist-tag that was used (e.g. `latest`, `next`).
 * @param registry The registry URL to which the package was published.
 * @returns Populated release information object consumed by semantic-release.
 */
export const getReleaseInfo = (
    { name }: PackageJson,
    { env: { DEFAULT_NPM_REGISTRY = OFFICIAL_REGISTRY }, nextRelease: { version } }: PublishContext,
    distributionTag: string,
    registry: string,
): ReleaseInfo => {
    return {
        channel: distributionTag,
        name: `pnpm package (@${distributionTag} dist-tag)`,
        url: normalizeUrl(registry) === normalizeUrl(DEFAULT_NPM_REGISTRY) ? `https://www.npmjs.com/package/${name as string}/v/${version}` : undefined,
    };
};

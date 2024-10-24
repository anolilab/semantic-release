import type { PackageJson } from "@visulima/package";
import normalizeUrl from "normalize-url";

import type { PublishContext } from "../definitions/context";

export interface ReleaseInfo {
    channel: string;
    name: string;
    url?: string;
}

export const getReleaseInfo = (
    { name }: PackageJson,
    { env: { DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org/" }, nextRelease: { version } }: PublishContext,
    distributionTag: string,
    registry: string,
): ReleaseInfo => {
    return {
        channel: distributionTag,
        name: `pnpm package (@${distributionTag} dist-tag)`,
        url: normalizeUrl(registry) === normalizeUrl(DEFAULT_NPM_REGISTRY) ? `https://www.npmjs.com/package/${name as string}/v/${version}` : undefined,
    };
};

import { validRange } from "semver";

export default (channel: string | null | undefined): string => (channel ? (validRange(channel) ? `release-${channel}` : channel) : "latest");

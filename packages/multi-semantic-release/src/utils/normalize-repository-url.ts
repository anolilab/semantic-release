/**
 * Normalize a repository URL by removing npm-specific prefixes that git doesn't understand.
 * Converts formats like `git+https://...` or `git+ssh://...` to `https://...` or `ssh://...`.
 * @param url The repository URL to normalize.
 * @returns The normalized repository URL, or the original URL if no normalization is needed.
 * @internal
 */
const normalizeRepositoryUrl = (url: string | undefined): string | undefined => {
    if (!url) {
        return url;
    }

    // Remove git+ prefix if present (npm package.json format)
    // Formats: git+https://, git+ssh://, git://
    if (url.startsWith("git+")) {
        return url.slice(4);
    }

    // Remove git:// prefix if present (legacy git protocol)
    if (url.startsWith("git://")) {
        return url.replace(/^git:\/\//u, "https://");
    }

    return url;
};

export default normalizeRepositoryUrl;

/**
 * Normalize a repository URL by removing npm-specific prefixes that git doesn't understand.
 * Converts formats like `git+https://...` or `git+ssh://...` to `https://...` or `ssh://...`.
 * Note: When using token-based authentication (e.g., GITHUB_TOKEN, CI_JOB_TOKEN), semantic-release automatically
 * converts repository URLs to HTTPS format regardless of the repositoryUrl format specified.
 * This normalization ensures git commands receive valid URLs without npm-specific prefixes.
 *
 * Important: URLs that already contain authentication tokens (e.g., `https://token@host/repo.git`)
 * are left unchanged to avoid interfering with semantic-release's token handling.
 * @param url The repository URL to normalize.
 * @returns The normalized repository URL, or the original URL if no normalization is needed.
 * @internal
 */
const normalizeRepositoryUrl = (url: string | undefined): string | undefined => {
    if (!url) {
        return url;
    }

    // Skip normalization if URL already contains authentication (e.g., token@host or user@host)
    // This prevents interfering with semantic-release's automatic token injection
    // Pattern matches: protocol://[user[:password]@]host or protocol://token@host
    if (/^[^:]+:\/\/[^@]+@/u.test(url)) {
        // Still remove git+ prefix if present, but preserve the auth part
        if (url.startsWith("git+")) {
            return url.slice(4);
        }

        return url;
    }

    // Remove git+ prefix if present (npm package.json format)
    // Formats: git+https://, git+ssh://, git://
    // This converts npm package.json repository URLs to standard git URL formats
    if (url.startsWith("git+")) {
        return url.slice(4);
    }

    // Remove git:// prefix if present (legacy git protocol)
    // Convert to https:// as git:// is deprecated and not supported by GitHub
    if (url.startsWith("git://")) {
        return url.replace(/^git:\/\//u, "https://");
    }

    return url;
};

export default normalizeRepositoryUrl;

/**
 * Public npm registry used as default when no custom registry is configured via `package.json`,
 * environment variables or `.npmrc`.
 * @see https://registry.npmjs.org/
 */
export const DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org/";

/**
 * Official npm registry URL used for OIDC trusted publishing.
 * @see https://registry.npmjs.org/
 */
export const OFFICIAL_REGISTRY = "https://registry.npmjs.org/";

/**
 * GitHub Actions provider name used for OIDC detection.
 */
export const GITHUB_ACTIONS_PROVIDER_NAME = "GitHub Actions";

/**
 * GitLab Pipelines provider name used for OIDC detection.
 */
export const GITLAB_PIPELINES_PROVIDER_NAME = "GitLab CI/CD";

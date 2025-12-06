# Behavioral Changes: v2 to v3

This document outlines all behavioral changes between the last v2 releases and v3.0.0 for all packages in the semantic-release monorepo.

## Comparison Summary

| Package | Last v2 Version | v3.0.0 Release Date | Key Behavioral Changes |
|---------|---------------|-------------------|----------------------|
| `@anolilab/multi-semantic-release` | 2.0.9 | 2025-11-20 | Catalog change detection, consistent cwd handling, dry-run support |
| `@anolilab/semantic-release-pnpm` | 2.0.5 | 2025-11-20 | Trusted publishing support, enhanced OIDC authentication |
| `@anolilab/semantic-release-clean-package-json` | 2.0.3 | 2025-06-17 | Node.js version requirement change |
| `@anolilab/rc` | 2.0.5 | 2025-11-20 | Node.js version requirement change |

---

## @anolilab/multi-semantic-release

### Breaking Changes

#### Node.js Version Requirements
- **v2**: Supported Node.js versions varied by package
- **v3**: Minimum Node.js version is now **v22.14.0** (or v24.10.0+ for v24 range)
- **Impact**: Projects using Node.js < 22.14.0 will need to upgrade

### New Features

#### 1. Catalog Change Detection
- **v2**: Only detected changes based on commits to package directories
- **v3**: Now detects changes in catalog files (like `pnpm-workspace.yaml`) and triggers releases for affected packages
- **Behavior**: 
  - Catalog changes are detected once per multirelease (cached)
  - Packages affected by catalog changes will trigger releases even without direct commits
  - Release type is determined by catalog change severity (major/minor/patch)
  - If both catalog changes and commits trigger releases, the highest severity is used
- **Impact**: Packages may now release more frequently if catalog dependencies change

#### 2. Consistent `context.cwd` Handling
- **v2**: `context.cwd` was not consistently set across all plugin hooks
- **v3**: `context.cwd` is now explicitly set to the package directory (`dir`) in all plugin hooks:
  - `verifyConditions`
  - `analyzeCommits`
  - `generateNotes`
  - `prepare`
  - `publish`
  - `verifyRelease`
- **Impact**: Plugins can now reliably access package-specific files and artifacts using `context.cwd`

#### 3. Dry-Run Flag Support
- **v2**: Dry-run flag may not have been properly propagated
- **v3**: Dry-run flag is now properly supported and respected in the `prepare` hook
- **Behavior**: When `dryRun` is true, the prepare step is skipped
- **Impact**: Dry-run mode now works correctly for testing releases

#### 4. Enhanced Debug Logging
- **v2**: Limited debug information about branches and release channels
- **v3**: Added debug logging for:
  - Branch channel information
  - Release channel information
  - Catalog change detection results
  - Package-specific release type decisions
- **Impact**: Better debugging capabilities for troubleshooting release issues

#### 5. Git Root Handling
- **v2**: Tag head lookup may have used incorrect working directory
- **v3**: Ensures consistent git root handling by explicitly resolving the git repository root before tag operations
- **Behavior**: Uses `git rev-parse --show-toplevel` to ensure correct git root context
- **Impact**: More reliable tag operations in monorepos with nested git repositories

### Bug Fixes

#### 1. Async Tag Head Handling
- **v2**: `getTagHead` was not properly awaited, potentially causing race conditions
- **v3**: `getTagHead` is now properly awaited in `generateNotes`
- **Impact**: Fixes issue #232 - prevents potential race conditions and incorrect tag resolution

#### 2. Yargs Types
- **v2**: CLI argument parsing may have had type issues
- **v3**: Added proper yargs types and updated configurations
- **Impact**: Better TypeScript support and type safety

### Dependencies Upgraded
- `@anolilab/semantic-release-clean-package-json`: upgraded to 4.0.0
- `@anolilab/semantic-release-pnpm`: upgraded to 3.0.0

---

## @anolilab/semantic-release-pnpm

### Breaking Changes

#### Node.js Version Requirements
- **v2**: Supported Node.js versions varied
- **v3**: Minimum Node.js version is now **v22.14.0** (or v24.10.0+ for v24 range)
- **Impact**: Projects using Node.js < 22.14.0 will need to upgrade

### New Features

#### 1. Trusted Publishing Support
- **v2**: Required npm token authentication via environment variables
- **v3**: Now supports npm's trusted publishing feature using OIDC (OpenID Connect)
- **Behavior**:
  - For GitHub Actions: Requires `id-token: write` permission
  - For GitLab Pipelines: Requires `NPM_ID_TOKEN` with audience `npm:registry.npmjs.org`
  - Automatically generates provenance attestations when using trusted publishing
  - Falls back to token authentication for unsupported CI providers
- **Impact**: 
  - More secure publishing without managing long-lived tokens
  - Automatic provenance generation
  - Better support for modern CI/CD authentication

#### 2. Enhanced npm Authentication
- **v2**: Basic token authentication
- **v3**: Enhanced authentication handling with:
  - OIDC context handling
  - Better error messages and debug logs
  - Caching for `whoami` results to reduce API calls
- **Impact**: More reliable authentication and better debugging

### Documentation Changes

#### Authentication Documentation
- **v2**: Focused on token-based authentication
- **v3**: Comprehensive documentation covering:
  - Trusted publishing (recommended for official registry)
  - Granular access tokens (for unsupported CI providers)
  - Alternative registry authentication
  - Provenance configuration

### Bug Fixes

#### 1. OIDC Authentication Handling
- **v2**: OIDC context may not have been properly handled
- **v3**: Enhanced OIDC context handling with better error handling and debug logs
- **Impact**: More reliable authentication in CI/CD environments

#### 2. Test Improvements
- **v2**: Integration tests may have been incomplete
- **v3**: Enhanced integration and unit tests for npm authentication
- **Impact**: Better test coverage and reliability

### Dependencies Upgraded
- `@anolilab/rc`: upgraded to 3.0.0

---

## @anolilab/semantic-release-clean-package-json

### Breaking Changes

#### Node.js Version Requirements
- **v2**: Supported Node.js >= 18.17 <= 24.*
- **v3**: Minimum Node.js version is now **>= 20.8.1**
- **Impact**: Projects using Node.js 18.x will need to upgrade to Node.js 20.8.1 or higher

### Dependencies Upgraded
- `@anolilab/semantic-release-pnpm`: upgraded to 2.0.0

---

## @anolilab/rc

### Breaking Changes

#### Node.js Version Requirements
- **v2**: Supported Node.js >= 20.8.1
- **v3**: Minimum Node.js version is now **^22.14.0 || >=24.10.0**
- **Impact**: Projects using Node.js 20.x will need to upgrade to Node.js 22.14.0 or higher

### New Features

#### 1. Enhanced Type Handling
- **v2**: Basic type handling
- **v3**: Improved type handling and TypeScript support
- **Impact**: Better type safety and developer experience

### Code Changes

#### Package Configuration
- **v2**: Included `anolilab.eslint-config` configuration in `package.json`
- **v3**: Removed `anolilab.eslint-config` configuration (likely moved to shared config)
- **Impact**: Configuration is now managed differently, but functionality remains the same

#### Build Configuration
- **v3**: Added `requireCJS.builtinNodeModules: true` to packem config
- **Impact**: Better CommonJS compatibility

---

## Summary of Behavioral Impact

### High Impact Changes

1. **Node.js Version Requirements**: All packages now require Node.js 22.14.0+ (or 24.10.0+), which is a breaking change for projects on older Node.js versions.

2. **Catalog Change Detection** (`multi-semantic-release`): Packages may now release more frequently if catalog dependencies change, even without direct commits to the package.

3. **Consistent `context.cwd`** (`multi-semantic-release`): Plugins can now reliably use `context.cwd` to access package-specific files, which may change plugin behavior.

4. **Trusted Publishing** (`semantic-release-pnpm`): Authentication method changes from token-based to OIDC-based for supported CI providers, requiring CI configuration updates.

### Medium Impact Changes

1. **Dry-Run Support** (`multi-semantic-release`): Dry-run mode now works correctly, which may affect testing workflows.

2. **Enhanced Debug Logging**: More verbose debug output may affect log parsing or CI output.

3. **Git Root Handling** (`multi-semantic-release`): More reliable tag operations, but may behave differently in edge cases.

### Low Impact Changes

1. **Type Improvements**: Better TypeScript support, but no runtime behavior changes.

2. **Test Improvements**: Better test coverage, but no user-facing changes.

3. **Documentation Updates**: Improved documentation, but no functional changes.

---

## Migration Recommendations

1. **Upgrade Node.js**: Ensure your CI/CD and local development environments use Node.js 22.14.0+ (or 24.10.0+).

2. **Update CI Configuration** (`semantic-release-pnpm` users):
   - For GitHub Actions: Add `id-token: write` permission
   - For GitLab Pipelines: Configure `NPM_ID_TOKEN` in `id_tokens`
   - For other CI providers: Continue using granular access tokens

3. **Review Release Behavior** (`multi-semantic-release` users):
   - Be aware that catalog changes may trigger releases
   - Test dry-run mode to ensure it works as expected
   - Verify plugins work correctly with the new `context.cwd` behavior

4. **Test Thoroughly**: Test your release process in a staging environment before upgrading to v3 in production.

---

## References

- [multi-semantic-release v3.0.0 Release Notes](https://github.com/anolilab/semantic-release/compare/@anolilab/multi-semantic-release@2.0.9...@anolilab/multi-semantic-release@3.0.0)
- [semantic-release-pnpm v3.0.0 Release Notes](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-pnpm@2.0.5...@anolilab/semantic-release-pnpm@3.0.0)
- [semantic-release-clean-package-json v3.0.0 Release Notes](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-clean-package-json@2.0.3...@anolilab/semantic-release-clean-package-json@3.0.0)
- [rc v3.0.0 Release Notes](https://github.com/anolilab/semantic-release/compare/@anolilab/rc@2.0.5...@anolilab/rc@3.0.0)

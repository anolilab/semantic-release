# JSR Workspaces Fixture

This fixture is used for testing multi-semantic-release integration with JSR (JavaScript Registry) packages.

## Purpose

This fixture verifies that:
- The `context.cwd` is correctly set to each package's directory
- Semantic-release plugins receive the correct working directory
- Dry-run mode works correctly with JSR packages
- Package dependencies are properly resolved in monorepo context

## Structure

```
jsrWorkspaces/
├── package.json (root workspace config)
└── packages/
    ├── a/
    │   ├── package.json (npm package config)
    │   ├── jsr.json (JSR registry config)
    │   └── src/
    │       └── index.ts (source code)
    └── b/
        ├── package.json (npm package config, depends on package a)
        ├── jsr.json (JSR registry config)
        └── src/
            └── index.ts (source code)
```

## Usage

This fixture is used in the integration test:
- Test: `"jsr plugin receives correct cwd for each package (dry-run)"`
- Location: `__tests__/multi-semantic-release.test.ts`

The test uses a mock JSR plugin that simulates the behavior of [@sebbo2002/semantic-release-jsr](https://github.com/sebbo2002/semantic-release-jsr).

## Testing Scenario

1. Creates a Git repository with this fixture
2. Commits changes with a feat commit (triggers semantic version bump)
3. Runs multi-semantic-release with the mock JSR plugin
4. Verifies that plugin hooks receive correct package-specific `context.cwd`
5. Ensures both packages a and b are processed correctly

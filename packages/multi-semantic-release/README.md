<div align="center">

<img src="https://github.com/anolilab/semantic-release/blob/main/.github/logo.svg" alt="Logo" width="200">

<h1>Multi Semantic Release</h1>

hacky [semantic-release](https://github.com/semantic-release/semantic-release) for monorepos based on [qiwi/multi-semantic-release](https://github.com/qiwi/multi-semantic-release)

[![npm-image]][npm-url] [![license-image]][license-url]

</div>

---

<div align="center">
    <p>
        <sup>
            Daniel Bannert's open source work is supported by the community on <a href="https://github.com/sponsors/prisis">GitHub Sponsors</a>
        </sup>
    </p>
</div>

---

This fork of [dhoub/multi-semantic-release](https://github.com/dhoulb/multi-semantic-release) replaces [`setImmediate` loops](https://github.com/dhoulb/multi-semantic-release/blob/561a8e66133d422d88008c32c479d1148876aba4/lib/wait.js#L13)
and [`execa.sync` hooks](https://github.com/dhoulb/multi-semantic-release/blob/561a8e66133d422d88008c32c479d1148876aba4/lib/execaHook.js#L5) with event-driven flow and finally makes possible to run the most release operations in parallel.
🎉 🎉 🎉

This package should work well, but **may not be fundamentally stable enough** for important production use as
it's pretty dependent on how semantic-release works (so it may break or get out-of-date in future versions
of semantic-release).

One of the best things about semantic-release is forgetting about version numbers. In a monorepo though there's still
a lot of version number management required for local deps (packages in the same monorepo referenced in `dependencies`
or `devDependencies` or `peerDependencies`). However in multi-semantic-release the version numbers of local deps are
written into `package.json` at release time. This means there's no need to hard-code versions any more
(we recommend just using `*` asterisk instead in your repo code).

### Key features

- CLI & JS API
- Automated & configurable cross-pkg version bumping
- Provides alpha & beta-branched release flow
- Supports npm (v7+), yarn, pnpm, bolt-based monorepos
- Optional packages ignoring
- Linux/MacOs/Windows support

## Install

```bash
npm install --save-dev @anolilab/multi-semantic-release@latest semantic-release@latest
```

```sh
pnpm add -D @anolilab/multi-semantic-release@latest semantic-release@latest
```

```sh
yarn add -D @anolilab/multi-semantic-release@latest semantic-release@latest
```

## Usage

```sh
multi-semantic-release
```

## Requirements

- Node.js >= 20.6.1
- [git-notes enabled](https://github.com/semantic-release/semantic-release/blob/2e4b901c4f412980a425469fae49cfaef500d47a/docs/support/troubleshooting.md#release-not-found-release-branch-after-git-push---force)

### yarn / npm (v7+)

Make sure to have a `workspaces` attribute inside your `package.json` project file. In there, you can set a list of packages that you might want to process in the msr process, as well as ignore others. For example, let's say your project has 4 packages (i.e. a, b, c and d) and you want to process only a and d (ignore b and c). You can set the following structure in your `package.json` file:

```json
{
    "name": "msr-test-yarn",
    "author": "Dave Houlbrooke <dave@shax.com",
    "version": "0.0.0-semantically-released",
    "private": true,
    "license": "0BSD",
    "engines": {
        "node": ">=8.3"
    },
    "workspaces": ["packages/*", "!packages/b/**", "!packages/c/**"],
    "release": {
        "plugins": ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
        "noCi": true
    }
}
```

### pnpm

Make sure to have a `packages` attribute inside your `pnpm-workspace.yaml` in the root of your project.

> Note: You need to have the `"workspaces": ["packages/*"]` attribute inside your `package.json` project file as well, need from semantic-release.

In there, you can set a list of packages that you might want to process in the msr process, as well as ignore others.
For example, let's say your project has 4 packages (i.e. a, b, c and d) and you want to process only a and d (ignore b and c). You can set the following structure in your `pnpm-workspace.yaml` file:

```yaml
packages:
    - "packages/**"
    - "!packages/b/**"
    - "!packages/c/**"
```

### bolt

Make sure to have a `bolt.workspaces` attribute inside your `package.json` project file.
In there, you can set a list of packages that you might want to process in the msr process, as well as ignore others.
For example, let's say your project has 4 packages (i.e. a, b, c and d) and you want to process only a and d (ignore b and c). You can set the following structure in your `package.json` file:

```json
{
    "name": "msr-test-bolt",
    "author": "Dave Houlbrooke <dave@shax.com",
    "version": "0.0.0-semantically-released",
    "private": true,
    "license": "0BSD",
    "engines": {
        "node": ">=8.3"
    },
    "bolt": {
        "workspaces": ["packages/*", "!packages/b/**", "!packages/c/**"]
    },
    "release": {
        "plugins": ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
        "noCi": true
    }
}
```

## Configuring Multi-Semantic-Release

Alternatively some options may be set via CLI flags.

**Note:** CLI arguments take precedence over options configured in the configuration file.

## Configuration

Multi-semantic-release can be configured using a configuration file in any of the following formats:

### Configuration File Formats

1. **`package.json`** (under the `"multi-release"` key):
   ```json
   {
     "name": "my-monorepo",
     "version": "1.0.0",
     "multi-release": {
       "deps": {
         "bump": "inherit",
       },
       "ignorePackages": ["packages/legacy/**"],
       "tagFormat": "${name}@${version}"
     }
   }
   ```

2. **`.multi-releaserc`** (JSON format):
   ```json
   {
     "deps": {
       "bump": "inherit",
     },
     "ignorePackages": ["packages/legacy/**"],
     "tagFormat": "${name}@${version}"
   }
   ```

3. **`.multi-releaserc.json`**:
   ```json
   {
     "deps": {
       "bump": "inherit",
     }
   }
   ```

4. **`.multi-releaserc.js`** (CommonJS module):
   ```javascript
   module.exports = {
     deps: {
       bump: "inherit",
     },
     ignorePackages: ["packages/legacy/**"]
   };
   ```

5. **`.multi-releaserc.cjs`** (CommonJS module):
   ```javascript
   module.exports = {
     deps: {
       bump: "inherit",
       excludeDependencies: ["@visulima/packem", "my-circular-package"]
     }
   };
   ```

6. **`multi-release.config.js`** (ES module):
   ```javascript
   export default {
     deps: {
       bump: "inherit",
     }
   };
   ```

### Configuration Search

Multi-semantic-release will search for configuration files in the following order:
1. `package.json` (under `"multi-release"` property)
2. `.multi-releaserc`
3. `.multi-releaserc.json`
4. `.multi-releaserc.js`
5. `.multi-releaserc.cjs`
6. `multi-release.config.js`

The first configuration file found will be used, and the search stops there.

### Options

| Option            | Type              | CLI Flag               | Description                                                                                                                                                                                                                                             |
| ----------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dryRun            | `boolean`         | `--dry-run`            | Dry run mode.                                                                                                                                                                                                                                           |
| logLevel          | `String`          | `--log-level`          | Sets the internal logger verbosity level: `error, warn, info, debug, trace`. Defaults to `info`.                                                                                                                                                        |
| debug             | `boolean`         | `--debug`              | Output debugging information. Shortcut for `--logLevel=debug`.                                                                                                                                                                                          |
| silent            | `boolean`         | `--silent`             | Turns off any log outputs.                                                                                                                                                                                                                              |
| extends           | `String \| Array` | N/A                    | List of modules or file paths containing a shareable configuration. If multiple shareable configurations are set, they will be imported in the order defined with each configuration option taking precedence over the options defined in the previous. |
| sequentialInit    | `boolean`         | `--sequential-init`    | Avoid hypothetical concurrent initialization collisions.                                                                                                                                                                                                |
| sequentialPrepare | `boolean`         | `--sequential-prepare` | Avoid hypothetical concurrent preparation collisions. **True by default.**                                                                                                                                                                              |
| firstParent       | `boolean`         | `--first-parent`       | Apply commit filtering to current branch only.                                                                                                                                                                                                          |
| ignorePrivate     | `boolean`         | `--ignore-private`     | Exclude private packages. **True by default.**                                                                                                                                                                                                          |
| ignorePackages    | `String \| Array` | `--ignore-packages`    | Packages list to be ignored on bumping process (appended to the ones that already exist at package.json workspaces). If using the CLI flag, supply a comma seperated list of strings.                                                                   |
| tagFormat         | `String`          | `--tag-format`         | Format to use when creating tag names. Should include "name" and "version" vars. Default: `"${name}@${version}"` which generates "package-name@1.0.0"                                                                                                   |
| deps              | `Object`          | N/A                    | Dependency handling, see below for possible values.                                                                                                                                                                                                     |

### `deps` Options

| Option  | Type                                 | CLI Flag         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bump    | `override \| satisfy \| inherit`     | `--deps.bump`    | Define deps version update rule. <ul><li>`override` — replace any prev version with the next one</li><li>`satisfy` — check the next pkg version against its current references. If it matches (`*` matches to any, `1.1.0` matches `1.1.x`, `1.5.0` matches to `^1.0.0` and so on) release will not be triggered, if not `override` strategy will be applied instead; `inherit` will try to follow the current declaration version/range. `~1.0.0` + `minor` turns into `~1.1.0`, `1.x` + `major` gives `2.x`, but `1.x` + `minor` gives `1.x` so there will be no release, etc. +;</li><li>`ignore` prevent dependencies from being bumped by MSR</li></ul> |
| release | `patch \| minor \| major \| inherit` | `--deps.release` | Define release type for dependent package if any of its deps changes. <ul><li>`patch`, `minor`, `major` — strictly declare the release type that occurs when any dependency is updated;</li><li> `inherit` — applies the "highest" release of updated deps to the package. <br/> _For example, if any dep has a breaking change, `major` release will be applied to the all dependants up the chain._</li></ul>                                                                                                                                                                                                                                              |
| prefix  | `'^' \| '~' \| ''`                   | `--deps.prefix`  | Optional prefix to be attached to the next version if `bump` is set to `override`. Supported values: `^` \| `~` \| `''` (empty string) ; **`''` by default**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### Examples

- Via CLI:

```sh
$ multi-semantic-release --ignore-packages=packages/a/**,packages/b/** --deps.bump=inherit
```

## Configuring Semantic-Release

**MSR** requires **semrel** config to be added [in any supported format](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration) for each package or/and declared in repo root (`globalConfig` is extremely useful if all the modules have the same strategy of release).
NOTE config resolver joins `globalConfig` and `packageConfig` during execution.

```javascript
// Load the package-specific options.
const { options: pkgOptions } = await getConfig(dir);

// The 'final options' are the global options merged with package-specific options.
// We merge this ourselves because package-specific options can override global options.
const finalOptions = Object.assign({}, globalOptions, pkgOptions);
```

Make sure to have a `workspaces` attribute inside your `package.json` project file. In there, you can set a list of packages that you might want to process in the msr process, as well as ignore others. For example, let's say your project has 4 packages (i.e. a, b, c and d) and you want to process only a and d (ignore b and c). You can set the following structure in your `package.json` file:

```json
{
    "name": "msr-__tests__-yarn",
    "author": "Dave Houlbrooke <dave@shax.com",
    "version": "0.0.0-semantically-released",
    "private": true,
    "license": "0BSD",
    "engines": {
        "node": ">=8.3"
    },
    "workspaces": ["packages/*", "!packages/b/**", "!packages/c/**"],
    "release": {
        "plugins": ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"],
        "noCi": true
    }
}
```

You can also ignore it with the CLI:

```bash
$ multi-semantic-release --ignore-packages=packages/b/**,packages/c/**
```

You can also combine the CLI ignore options with the `!` operator at each package inside `workspaces` attribute. Even though you can use the CLI to ignore options, you can't use it to set which packages to be released – i.e. you still need to set the `workspaces` attribute inside the `package.json`.

## Verified usage examples

We use this tool to release our JS platform code inhouse (GitHub Enterprise + JB TeamCity) and for our OSS (GitHub + Travis CI). Guaranteed working configurations available in projects.

- [anolilab/multi-semantic-release](https://github.com/anolilab/semantic-release)
- [visulima/visulima](https://github.com/visulima/visulima)
- [qiwi/substrate](https://github.com/qiwi/substrate)
- [qiwi/json-rpc](https://github.com/qiwi/json-rpc)
- [qiwi/lint-config-qiwi](https://github.com/qiwi/lint-config-qiwi)

## Troubleshooting

### npm v8.5+: npm ERR! notarget No matching version found for...

When releasing a monorepo you may get a `npm ERR! code ETARGET` error. This is caused by `npm version` creating a reify update on packages with future dependency versions MSR has not updated yet.

The simplest work around is to set [workspaces-update](https://docs.npmjs.com/cli/v8/commands/npm-version#workspaces-update) to false either in your .npmrc or manually by running `npm config set workspaces-update false`

### npm: invalid npm token

When releasing a monorepos you may get `EINVALIDNPMTOKEN` error. The more packages, the more chance of error, unfortunately.

```shell
INVALIDNPMTOKEN Invalid npm token.
The npm token (https://github.com/semantic-release/npm/blob/master/README.md#npm-registry-authentication) configured in the NPM_TOKEN environment variable must be a valid token (https://docs.npmjs.com/getting-started/working_with_tokens) allowing to publish to the registry https://registry.npmjs.org/.
```

Do not rush to change your token. _Perhaps_ this is related to [`npm whoami` request](https://github.com/semantic-release/npm/blob/master/lib/verify-auth.js#L21) throttling on your registry (just a hypothesis: https://github.com/semantic-release/npm/pull/416). At this point you can:

- Rerun your build as many times as necessary. You may get lucky in a new attempt.
- Use [semrel-extra/npm plugin](https://github.com/semrel-extra/npm) for npm publishing (recommended).

### git: connection reset by peer

This error seems to be related to concurrent git invocations ([issues/24](https://github.com/dhoulb/multi-semantic-release/issues/24)). Or maybe not.
Anyway we've added a special [`--sequental-init`](#cli) flag to queue up these calls.

## Implementation notes (and other thoughts)

### Support for monorepos

Automatically finds packages as long as workspaces are configured as-per the workspace-feature of one of the support package managers.

- [Yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/).
- [Npm workspaces (Version 7.x)](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [pnpm workspace](https://pnpm.js.org/workspaces/)
- [bolt workspaces](https://github.com/boltpkg/bolt#configuration)

I'm aware Lerna is the best-known tool right now, but in future it seems clear it will be replaced by functionality in Yarn and NPM directly. If you use Yarn workspaces today (January 2019), then publishing is the only remaining feature Lerna is _really_ required for (though it'd be lovely if Yarn added parallel script execution). Thus using multi-semantic-release means you can probably remove Lerna entirely from your project.

### Iteration vs coordination

Other packages that enable semantic-release for monorepos work by iterating into each package and running the `semantic-release` command. This is conceptually simple but unfortunately not viable because:

- If a package is published that depends on minor changes that have been made in a sibling package it could cause extremely subtle errors (the worst kind!) — if the project follows semver religiously this should never happen, but it's better to eliminate the _potential_ for errors
- Dependency version numbers need to reflect the _next_ release at time of publishing, so a package needs to know the state of _all other packages_ before it can publish correctly — this central state needs to be coordinated by something

### Local dependencies and version numbers

A key requirement is handling local dep version numbers elegantly. multi-semantic-release does the following:

- The next version number of all packages is established first
- If a release has not changed but has local deps that _have_ changed... do a `patch` bump on that package too
- Before packages are released (in semantic-release's prepare step), the correct current/next version number of _all_ local dependencies is written into the `package.json` file (overwriting any existing value)
- This ensures the package at the time of publishing will be atomically correct with all other packages in the monorepo.

The above means that, possibly, if someone upgrades dependencies and pulls down a package from NPM _during the multirelease_ (before all its deps have been published at their next versions), then their `npm install` will fail (it will work if they try again in a few minutes). On balance I thought it was more important to be atomically correct (this situation should be fairly rare assuming projects commit their lockfiles).

### Integration with semantic-release

This is the jankiest part of multi-semantic-release and most likely part to break relies. I expect this to cause maintenance issues down the line. In an ideal world semantic-release will bake-in support for monorepos (making this package unnecessary).

The way I ended up integrating is to create a custom "inline plugin" for semantic-release, and passing that in to `semanticRelease()` as the only plugin. This then calls any other configured plugins to retrieve and potentially modify the response.

The plugin starts all release at once, then pauses them (using Promises) at various points to allow other packages in the multirelease to catch up. This is mainly needed so the version number of all packages can be established _before_ any package is released. This allows us to do a `patch` bump on releases whose local deps have bumped, and to accurately write in the version of local deps in each `package.json`

The inline plugin does the following:

- **verifyConditions:** _not used_
- **analyzeCommits:**
    - Replaces `context.commits` with a list of commits filtered to the folder only
    - Calls `plugins.analyzeCommits()` to get the next release type (e.g. from @semantic-release/commit-analyzer)
    - Waits for _all_ packages to catch up to this point.
    - For packages that haven't bumped, checks if it has local deps (or deps of deps) that have bumped and returns `patch` if that's true
- **verifyRelease:** _not used_
- **generateNotes:**
    - Calls `plugins.generateNotes()` to get the notes (e.g. from @semantic-release/release-notes-generator)
    - Appends a section listing any local deps bumps (e.g. "my-pkg-2: upgraded to 1.2.1")
- **prepare:**
    - Writes in the correct version for local deps in `dependencies`, `devDependencies`, `peerDependencies` in `package.json`
    - Serialize the releases so they happen one-at-a-time (because semantic-release calls `git push` asynchronously, multiple releases at once fail because Git refs aren't locked — semantic-release should use `execa.sync()` so Git operations are atomic)
- **publish:** _not used_
- **success:** _not used_
- **fail:** _not used_

### Jank

The integration with semantic release is pretty janky — this is a quick summary of the reasons this package will be hard to maintain:

1. Had to filter `context.commits` object before it was used by `@semantic-release/commit-analyzer` (so it only lists commits for the corresponding directory).

- The actual Git filtering is easy peasy: see [getCommitsFiltered.js](https://github.com/dhoulb/multi-semantic-release/blob/master/lib/getCommitsFiltered.js)
- But overriding `context.commits` was very difficult! I did it eventually creating an _inline plugin_ and passing it into `semanticRelease()` via `options.plugins`
- The inline plugin proxies between semantic release and other configured plugins. It does what it needs to then calls e.g. `plugins.analyzeCommits()` with an overridden `context.commits` — see [createInlinePluginCreator.js](https://github.com/dhoulb/multi-semantic-release/blob/master/lib/createInlinePluginCreator.js)
- I think this is messy — inline plugins aren't even documented :(

2. Need to run the analyze commit step on _all_ plugins before any proceed to the publish step

- The inline plugin returns a Promise for every package then waits for all packages to analyze their commits before resolving them one at a time
- If packages have local deps (e.g. `dependencies` in package.json points to an internal package) this step also does a `patch` bump if any of them did a bump.
- This has to work recursively! See [hasChangedDeep.js](https://github.com/dhoulb/multi-semantic-release/blob/master/lib/hasChangedDeep.js)

3. The configuration can be layered (i.e. global `semantic-release` cli) and then per-directory overrides for individual packages).

- Had to duplicate the internal cosmiconfig setup from semantic release to get this working :(

4. I found Git getting itself into weird states because e.g. `git tag` is done asynchronously

- To get around this I had to stagger package publishing so they were done one at a time (which slows things down)
- I think calls to `execa()` in semantic release should be replaced with `execa.sync()` to ensure Git's internal state is atomic.
- Fortunately, another workaround has been implemented. `Synchronizer` is the neat part. It is critical to make the tag and commit publishing phases strictly sequential. [Event emitter allows](https://github.com/dhoulb/multi-semantic-release/blob/master/lib/getSynchronizer.js):
    - To synchronize release stages for all packages.
    - To ensure the completeness of checks and the sufficiency of conditions for a conflict-free process.

### Git tags

Releases always use a `tagFormat` of `my-pkg-1@1.0.1` for Git tags, and always overrides any `gitTag` set in semantic-release configuration.

I can personally see the potential for this option in coordinating a semantic-release (e.g. so two packages with the same tag always bump and release simultaneously). Unfortunately with the points of integration available in semantic-release, it was effectively impossible when releasing to stop a second package creating a duplicate tag (causing an error).

To make the `tagFormat` option work as intended the following would need to happen:

- semantic-release needs to check if a given tag already exists at a given commit, and not create it / push it if that's true
- Release notes for multiple package releases need to be merged BUT the Github release only done once (by having the notes merged at the semantic-release level but only published once, or having the Github plugin merge them)
- Make it clear in documentation that the default tag `v1.0.0` will have the same effect as Lerna's fixed mode (all changed monorepo packages released at same time)

## Supported Node.js Versions

Libraries in this ecosystem make the best effort to track
[Node.js' release schedule](https://nodejs.org/en/about/releases/). Here's [a
post on why we think this is important](https://medium.com/the-node-js-collection/maintainers-should-consider-following-node-js-release-schedule-ab08ed4de71a).

## Contributing

If you would like to help take a look at the [list of issues](https://github.com/anolilab/semantic-release/issues) and check our [Contributing](.github/CONTRIBUTING.md) guild.

> **Note:** please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## Credits

- [Daniel Bannert](https://github.com/prisis)
- [All Contributors](https://github.com/anolilab/semantic-release/graphs/contributors)
    - [hanseltime](https://github.com/hanseltime) -> https://github.com/qiwi/multi-semantic-release/pull/96
    - [lyh543](https://github.com/lyh543) -> https://github.com/dhoulb/multi-semantic-release/issues/111
- [dhoub/multi-semantic-release](https://github.com/dhoulb/multi-semantic-release)
- [qiwi/multi-semantic-release](https://github.com/qiwi/multi-semantic-release)

## License

[0BSD](./LICENSE.md)

[license-image]: https://img.shields.io/npm/l/@anolilab/multi-semantic-release?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"
[npm-image]: https://img.shields.io/npm/v/@anolilab/multi-semantic-release/latest.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/@anolilab/multi-semantic-releasv/latest "npm"

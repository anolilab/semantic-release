<div align="center">
  <h3>anolilab semantic-release-clean-package-json</h3>
  <p>
  A semantic-release plugin that cleans and optimizes package.json before publishing by removing unnecessary development and build-time properties
  </p>
</div>

<br />

<div align="center">

[![typescript-image]][typescript-url] [![npm-image]][npm-url] [![license-image]][license-url]

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

## Why?

When publishing packages to npm, many properties in `package.json` are only needed during development and build time, but not in the published package. This plugin automatically removes unnecessary properties while preserving essential ones needed for the package to work correctly in production.

Key benefits:

- Reduces package size by removing development-only properties
- Prevents leaking internal configuration and metadata
- Maintains a clean and focused package.json for end users
- Customizable property preservation through configuration

## Install

```sh
npm install @anolilab/semantic-release-clean-package-json
```

```sh
yarn add @anolilab/semantic-release-clean-package-json
```

```sh
pnpm add @anolilab/semantic-release-clean-package-json
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

> [!IMPORTANT]
> Very important: The plugin must be placed before the `@semantic-release/github` or `@semantic-release/git` and before `@anolilab/semantic-release-pnpm` or `@semantic-release/npm` plugin otherwise the `package.json` will be cleaned and published into GitHub / Your Git Provider.

```json
{
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@anolilab/semantic-release-clean-package-json",
        "@anolilab/semantic-release-pnpm",
        "@semantic-release/github"
    ]
}
```

## Steps that are used

| Step      | Description                                                                                                                                                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publish` | - Creates a backup of the original package.json file<br>- Removes all non-preserved properties from package.json<br>- Keeps properties specified in the default list and custom `keep` option<br>- Preserves specific npm scripts if they are in the keep list<br>- Writes the cleaned package.json file |
| `success` | - Restores the original package.json from backup<br>- Updates the version number to match the released version<br>- Removes the backup file<br>- Logs success or error messages                                                                                                                          |

### Options

| Options   | Description                | Default |
| --------- | -------------------------- | ------- |
| `pkgRoot` | Directory path to publish. | `.`     |
| `keep`    | Property names to keep.    | `[]`    |

**Note**: The `pkgRoot` directory must contain a `package.json`. The version will be updated only in the `package.json` and `npm-shrinkwrap.json` within the `pkgRoot` directory.

**Note**: If you use a [shareable configuration](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/shareable-configurations.md#shareable-configurations) that defines one of these options you can set it to `false` in your [**semantic-release** configuration](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration) in order to use the default value.

### Examples

The plugin can be configured with custom properties to keep in addition to the default preserved ones:

```json
{
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        [
            "@anolilab/semantic-release-clean-package-json",
            {
                "keep": ["custom field"]
            }
        ],
        "@anolilab/semantic-release-pnpm",
        "@semantic-release/github"
    ]
}
```

#### Example: Publishing a TypeScript Package

When publishing a TypeScript package, you might want to keep TypeScript-specific fields:

```jsonc
{
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        [
            "@anolilab/semantic-release-clean-package-json",
            {
                // This are the default values, just a example
                "keep": ["types", "typings", "typesVersions", "module"],
            },
        ],
        "@anolilab/semantic-release-pnpm",
        "@semantic-release/github",
    ],
}
```

#### Example: Custom Package Root

If your package.json is not in the root directory:

```json
{
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/github",
        [
            "@anolilab/semantic-release-clean-package-json",
            {
                "pkgRoot": "dist"
            }
        ],
        "@anolilab/semantic-release-pnpm"
    ]
}
```

### Default preserved properties

By default, these properties are preserved in `package.json`:

#### [npm](https://docs.npmjs.com/cli/v8/configuring-npm/package-json)

- `name`
- `version`
- `private`
- `publishConfig`
- `scripts.preinstall`
- `scripts.install`
- `scripts.postinstall`
- `scripts.dependencies`
- `files`
- `bin`
- `browser`
- `main`
- `man`
- `dependencies`
- `peerDependencies`
- `peerDependenciesMeta`
- `bundledDependencies`
- `optionalDependencies`
- `engines`
- `os`
- `cpu`
- `description`
- `keywords`
- `author`
- `contributors`
- `license`
- `homepage`
- `repository`
- `bugs`
- `funding`

#### CDNs

- [`jsdelivr`](https://www.jsdelivr.com/features#publishing-packages)
- [`unpkg`](https://unpkg.com/)

#### [Node.js](https://nodejs.org/api/packages.html#nodejs-packagejson-field-definitions)

- `type`
- `exports`
- `imports`

#### [VSCode Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)

- `publisher`
- `displayName`
- `categories`
- `galleryBanner`
- `preview`
- `contributes`
- `activationEvents`
- `badges`
- `markdown`
- `qna`
- `sponsor`
- `extensionPack`
- `extensionDependencies`
- `extensionKind`
- `icon`

#### [Angular Package Format](https://angular.io/guide/angular-package-format#legacy-resolution-keys)

- `fesm2020`
- `fesm2015`
- `esm2020`
- `es2020`

#### [TypeScript](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

- `types`
- `typings`
- `typesVersions`

#### Bundlers (Webpack, Rollup, esbuild)

- [`module`](https://stackoverflow.com/questions/42708484/what-is-the-module-package-json-field-for)
- [`sideEffects`](https://webpack.js.org/guides/tree-shaking/)

## Supported Node.js Versions

Libraries in this ecosystem make the best effort to track [Node.js’ release schedule](https://github.com/nodejs/release#release-schedule).
Here’s [a post on why we think this is important](https://medium.com/the-node-js-collection/maintainers-should-consider-following-node-js-release-schedule-ab08ed4de71a).

## Contributing

If you would like to help take a look at the [list of issues](https://github.com/anolilab/semantic-release/issues) and check our [Contributing](.github/CONTRIBUTING.md) guidelines.

> **Note:** please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## Credits

- [Daniel Bannert](https://github.com/prisis)
- [All Contributors](https://github.com/anolilab/semantic-release/graphs/contributors)

## License

The anolilab semantic-release-clean-package-json is open-sourced software licensed under the [MIT][license-url]

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]: "typescript"
[license-image]: https://img.shields.io/npm/l/@anolilab/semantic-release-clean-package-json?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"
[npm-image]: https://img.shields.io/npm/v/@anolilab/semantic-release-clean-package-json/latest.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/@anolilab/semantic-release-clean-package-json/v/latest "npm"

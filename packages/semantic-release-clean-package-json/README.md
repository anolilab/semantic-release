<div align="center">
  <h3>anolilab semantic-release-clean-package-json</h3>
  <p>
  Clean package.json before publish by removing unnecessary properties
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

```json
{
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@anolilab/semantic-release-pnpm",
        "@anolilab/semantic-release-clean-package-json"
    ]
}
```

## Steps that are used

| Step      | Description                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `prepare` | Modifing the `package.json` file with the [default preserved properties](#default-preserved-properties). |

### Options

| Options   | Description                | Default |
| --------- | -------------------------- | ------- |
| `pkgRoot` | Directory path to publish. | `.`     |
| `keep`    | Property names to keep.    | `[]`    |

**Note**: The `pkgRoot` directory must contain a `package.json`. The version will be updated only in the `package.json` and `npm-shrinkwrap.json` within the `pkgRoot` directory.

**Note**: If you use a [shareable configuration](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/shareable-configurations.md#shareable-configurations) that defines one of these options you can set it to `false` in your [**semantic-release** configuration](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration) in order to use the default value.

### Examples

```json
{
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@anolilab/semantic-release-pnpm",
        [
            "@anolilab/semantic-release-clean-package-json",
            {
                "keep": ["custom filed"]
            }
        ],
        "@semantic-release/github"
    ]
}
```

<!-- Copied from https://github.com/privatenumber/clean-pkg-json/blob/develop/src/default-keep-properties.ts -->
<!-- MIT License -->
<!-- Copyright (c) Hiroki Osame <hiroki.osame@gmail.com> -->

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

<!-- START_PACKAGE_OG_IMAGE_PLACEHOLDER -->

<a href="https://github.com/anolilab/semantic-release" align="center">

  <img src="__assets__/package-og.svg" alt="rc" />

</a>

<h3 align="center">The runtime configuration loader.</h3>

<!-- END_PACKAGE_OG_IMAGE_PLACEHOLDER -->

<br />

<div align="center">

[![typescript-image][typescript-badge]][typescript-url]
[![mit licence][license-badge]][license]
[![npm downloads][npm-downloads-badge]][npm-downloads]
[![Chat][chat-badge]][chat]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]

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
npm install @anolilab/rc
```

```sh
yarn add @anolilab/rc
```

```sh
pnpm add @anolilab/rc
```

## Usage

The main function provided by this module is rc. It allows you to load configuration settings for your application from different sources.

```ts
import { rc } from "@anolilab/rc";

const { config, files } = rc("npm");

// returns a merged config object with all found npmrc files and a files list what files where found.
```

### Api

- name (string): The application name. This is used to locate configuration files and environment variables.
- options (object, optional): An object with the following properties:
    - config (string, optional): Path to a specific configuration file.
    - cwd (string, optional): The current working directory to start searching for configuration files. Defaults to process.cwd().
    - defaults (object, optional): Default configuration values.
    - home (string, optional): The home directory to use. Defaults to os.homedir().
    - stopAt (string, optional): Directory to stop searching for configuration files.

## Standards

Given your application name (appname), rc will look in all the obvious places for configuration.

- The defaults object you passed in
- `/etc/${appname}/config`
- `/etc/${appname}rc`
- `$HOME/.config/${appname}/config`
- `$HOME/.config/${appname}`
- `$HOME/.${appname}/config`
- `$HOME/.${appname}rc`
- a local `.${appname}/config` and `.${appname}rc` and all found looking in `../../../ ../../ ../ ./` etc.
- if you passed environment variable `${appname}_config` then from that file
- if you passed options.config variable, then from that file
- environment variables prefixed with `${appname}_`
  or use "\_\_" to indicate nested properties <br/> _(e.g. `appname_foo__bar__baz` => `foo.bar.baz`)_

All configuration sources that were found will be flattened into one object, in this exact order.

## Api Docs

<!-- TYPEDOC -->

# @anolilab/rc

## Functions

### rc()

```ts
function rc(name, options?): object;
```

Defined in: [index.ts:193](https://github.com/anolilab/multi-semantic-release/blob/589293f977a51773a6380f8abdc37be2f9e43372/packages/rc/src/index.ts#L193)

Aggregates configuration from multiple sources (defaults, configuration files, and environment variables)
into a single object, following the same resolution logic as the original `rc` npm package.

The resolution order is (highest precedence last):

1. `options.defaults` – default values supplied by the caller
2. Configuration files discovered by getConfigFiles
3. Environment variables that start with `${name}_` (nested via `__`)

The function also returns the list of configuration file paths that were read while resolving the
configuration. No mutation is performed on any of the discovered files – they are only read.

#### Parameters

##### name

`string`

The base name of the application (used to derive env-var prefix and file names).

##### options?

Optional behaviour switches.

###### config?

`string`

Explicit path to a configuration file that should be merged last.

###### cwd?

`string`

Working directory to start searching for local configuration files.

###### defaults?

`Record`\<`string`, `any`\>

Default configuration values that act as the lowest precedence.

###### home?

`string`

Home directory to look for user-level configuration files. Defaults to the current user home directory.

###### stopAt?

`string`

Absolute path that acts as a boundary when traversing up the directory tree.

#### Returns

`object`

An object containing the final merged `config` and the ordered list of `files` that were considered.

##### config

```ts
config: Record<string, any>;
```

##### files

```ts
files: string[];
```

<!-- /TYPEDOC -->

## Related

- [rc](https://github.com/dominictarr/rc) - The non-configurable configuration loader for lazy people.

## Supported Node.js Versions

Libraries in this ecosystem make the best effort to track [Node.js’ release schedule](https://github.com/nodejs/release#release-schedule).
Here’s [a post on why we think this is important](https://medium.com/the-node-js-collection/maintainers-should-consider-following-node-js-release-schedule-ab08ed4de71a).

## Contributing

If you would like to help take a look at the [list of issues](https://github.com/anolilab/semantic-release/issues) and check our [Contributing](.github/CONTRIBUTING.md) guidelines.

> **Note:** please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## Credits

- [Daniel Bannert](https://github.com/prisis)
- [All Contributors](https://github.com/anolilab/semantic-release/graphs/contributors)

## Made with ❤️ at Anolilab

This is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Anolilab](https://www.anolilab.com/open-source) is a Development and AI Studio. Contact us at [hello@anolilab.com](mailto:hello@anolilab.com) if you need any help with these technologies or just want to say hi!

## License

The anolilab rc is open-sourced software licensed under the [MIT][license-url]

<!-- badges -->

[license-badge]: https://img.shields.io/npm/l/@anolilab/rc?style=for-the-badge
[license]: https://github.com/anolilab/multi-semantic-release/blob/main/LICENSE
[npm-downloads-badge]: https://img.shields.io/npm/dm/@anolilab/rc?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@anolilab/rc
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: https://github.com/anolilab/multi-semantic-release/blob/main/.github/CONTRIBUTING.md
[chat-badge]: https://img.shields.io/discord/902465130518949899.svg?style=for-the-badge
[chat]: https://discord.gg/4VuvwWGaaB
[typescript-badge]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]: https://www.typescriptlang.org/
[license-url]: LICENSE.md

<div align="center">
<h1>Semantic Release</h1>
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

This is a mono-repository that contains a collection of packages that provide various functions that can be used with [semantic-release](https://github.com/semantic-release/semantic-release) package.

## Usage

Check the README for each package within the `packages` directory for specific usage instructions.

## Featured Packages

| Package                                                               | Version                                                                                                                         | Description                                                                                                                                                                                                                                                                     |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [multi-semantic-release](packages/multi-semantic-release/README.md)   | ![npm](https://img.shields.io/npm/v/@anolilab/multi-semantic-release?style=flat-square&labelColor=292a44&color=663399&label=v)  | A hacky semantic-release for monorepos based on qiwi/multi-semantic-release                                                                                                                                                                                                     |                                                                                                                                |                        |
| [rc](packages/rc/README.md)                                           | ![npm](https://img.shields.io/npm/v/@anolilab/rc?style=flat-square&labelColor=292a44&color=663399&label=v)                      | This module provides a utility function to load rc configuration settings from various sources, including environment variables, default values, and configuration files located in multiple standard directories. It merges these settings into a single configuration object. |                                                                                                                                |                        |
| [semantic-release-pnpm](packages/semantic-release-pnpm/README.md)     | ![npm](https://img.shields.io/npm/v/@anolilab/semantic-release-pnpm?style=flat-square&labelColor=292a44&color=663399&label=v)   | Semantic-release plugin to publish a npm package with pnpm                                                                                                                                                                                                                      |                                                                                                                                |                        |
| [semantic-release-preset](packages/semantic-release-preset/README.md) | ![npm](https://img.shields.io/npm/v/@anolilab/semantic-release-preset?style=flat-square&labelColor=292a44&color=663399&label=v) | semantic-release is a fully automated version management and package publishing library                                                                                                                                                                                        |

## How We Version

We use [SemVer](https://semver.org/) for its versioning providing us an opt-in approach to releases.
This means we add a version number according to the spec, as you see below.
So rather than force developers to consume the latest and greatest, they can choose which version to consume and test any newer ones before upgrading.
Please the read the spec as it goes into further detail.

## Supported Node.js Versions

Libraries in this ecosystem make the best effort to track
[Node.js’ release schedule](https://nodejs.org/en/about/releases/). Here’s [a
post on why we think this is important](https://medium.com/the-node-js-collection/maintainers-should-consider-following-node-js-release-schedule-ab08ed4de71a).

Contributing
------------

If you would like to help take a look at the [list of issues](https://github.com/anolilab/semantic-release/issues) and check our [Contributing](.github/CONTRIBUTING.md) guild.

> **Note:** please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

Credits
-------------

- [Daniel Bannert](https://github.com/prisis)
- [All Contributors](https://github.com/anolilab/semantic-release/graphs/contributors)

License
-------------

The anolilab semantic release is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT)

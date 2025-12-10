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

<!-- START_TABLE_PLACEHOLDER -->
| Package | Version | Description |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@anolilab/multi-semantic-release](packages/multi-semantic-release/README.md) | [![npm](https://img.shields.io/npm/v/%40anolilab%2Fmulti-semantic-release?style=flat-square&labelColor=292a44&color=663399&label=v)](https://www.npmjs.com/package/%40anolilab%2Fmulti-semantic-release) | A multi semantic release tool for a monorepo. |
| [@anolilab/rc](packages/rc/README.md) | [![npm](https://img.shields.io/npm/v/%40anolilab%2Frc?style=flat-square&labelColor=292a44&color=663399&label=v)](https://www.npmjs.com/package/%40anolilab%2Frc) | The runtime configuration loader. |
| [@anolilab/semantic-release-clean-package-json](packages/semantic-release-clean-package-json/README.md) | [![npm](https://img.shields.io/npm/v/%40anolilab%2Fsemantic-release-clean-package-json?style=flat-square&labelColor=292a44&color=663399&label=v)](https://www.npmjs.com/package/%40anolilab%2Fsemantic-release-clean-package-json) | Clean package.json before publish by removing unnecessary properties. |
| [@anolilab/semantic-release-pnpm](packages/semantic-release-pnpm/README.md) | [![npm](https://img.shields.io/npm/v/%40anolilab%2Fsemantic-release-pnpm?style=flat-square&labelColor=292a44&color=663399&label=v)](https://www.npmjs.com/package/%40anolilab%2Fsemantic-release-pnpm) | Semantic-release plugin to publish a npm package with pnpm. |
| [@anolilab/semantic-release-preset](packages/semantic-release-preset/README.md) | [![npm](https://img.shields.io/npm/v/%40anolilab%2Fsemantic-release-preset?style=flat-square&labelColor=292a44&color=663399&label=v)](https://www.npmjs.com/package/%40anolilab%2Fsemantic-release-preset) | Semantic-release predefined presets. |
<!-- END_TABLE_PLACEHOLDER -->

## How We Version

We use [SemVer](https://semver.org/) for its versioning providing us an opt-in approach to releases.
This means we add a version number according to the spec, as you see below.
So rather than force developers to consume the latest and greatest, they can choose which version to consume and test any newer ones before upgrading.
Please the read the spec as it goes into further detail.

## Supported Node.js Versions

Libraries in this ecosystem make the best effort to track
[Node.js’ release schedule](https://nodejs.org/en/about/releases/). Here’s [a
post on why we think this is important](https://medium.com/the-node-js-collection/maintainers-should-consider-following-node-js-release-schedule-ab08ed4de71a).

## Community

The anolilab community can be found on [GitHub Discussions](https://github.com/anolilab/semantic-release/discussions), where you can ask questions, voice ideas, and share your projects.

To chat with other community members you can join the [Anolilab Discord](https://chat.anolilab.com).

Our [Code of Conduct](https://github.com/anolilab/semantic-release/blob/main/.github/CODE_OF_CONDUCT.md) applies to all Anolilab community channels.

## Contributing

Please see our [contributing.md][prs-welcome].

> **Note:** please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

### Good First Issues

We have a list of [good first issues](https://github.com/anolilab/semantic-release/labels/good%20first%20issue) that contain bugs that have a relatively limited scope. This is a great place to get started, gain experience, and get familiar with our contribution process.

## Credits

- [Daniel Bannert](https://github.com/prisis)
- [All Contributors](https://github.com/anolilab/semantic-release/graphs/contributors)

## License

The anolilab semantic-release is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT)

---

<div align="center">
  <p>
    <sub>Built with ❤️ by</sub>
  </p>
  <p>
    <a href="https://anolilab.com">
      <img src="./.github/assets/anolilab.svg" alt="Anolilab" width="400" />
    </a>
  </p>
</div>

<!-- badges -->

[license-badge]: https://img.shields.io/npm/l/@visulima/semantic-release?style=for-the-badge
[license]: https://github.com/anolilab/semantic-release/blob/main/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: https://github.com/anolilab/semantic-release/blob/main/.github/CONTRIBUTING.md
[chat-badge]: https://img.shields.io/discord/932323359193186354.svg?style=for-the-badge
[chat]: https://discord.gg/TtFJY8xkFK
[typescript-badge]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]: https://www.typescriptlang.org/
[repository]: https://github.com/anolilab/semantic-release

## @anolilab/semantic-release-clean-package-json [2.0.3](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-clean-package-json@2.0.2...@anolilab/semantic-release-clean-package-json@2.0.3) (2025-06-05)

### Bug Fixes

* all packages now allow node 24, update all dependencies ([dfc2518](https://github.com/anolilab/semantic-release/commit/dfc2518344702271582f6d60c44778aefc66ce14))
* **deps:** update patch updates ([#154](https://github.com/anolilab/semantic-release/issues/154)) ([26462d4](https://github.com/anolilab/semantic-release/commit/26462d456c3e1d471c360e97c38b5f0668e984fe))


### Dependencies

* **@anolilab/semantic-release-pnpm:** upgraded to 1.1.12

## @anolilab/semantic-release-clean-package-json [2.0.2](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-clean-package-json@2.0.1...@anolilab/semantic-release-clean-package-json@2.0.2) (2025-05-07)

### Bug Fixes

* update dependencies across multiple packages, including @anolilab/* and @visulima/* to latest versions ([fc3cbd3](https://github.com/anolilab/semantic-release/commit/fc3cbd353f550d7f2de194c34416c3074ba60b11))


### Dependencies

* **@anolilab/semantic-release-pnpm:** upgraded to 1.1.11

## @anolilab/semantic-release-clean-package-json [2.0.1](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-clean-package-json@2.0.0...@anolilab/semantic-release-clean-package-json@2.0.1) (2025-02-10)

### Bug Fixes

* **semantic-release-clean-package-json:** updated @visulima/*, and all all dev deps ([70a11b8](https://github.com/anolilab/semantic-release/commit/70a11b88b419308ebfd8fc24b259b5d91c93b1aa))


### Dependencies

* **@anolilab/semantic-release-pnpm:** upgraded to 1.1.10

## @anolilab/semantic-release-clean-package-json [2.0.0](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-clean-package-json@1.0.0...@anolilab/semantic-release-clean-package-json@2.0.0) (2025-01-22)

### ⚠ BREAKING CHANGES

* **semantic-release-clean-package-json:** Changed plugin steps to publish and success from prepare

### Bug Fixes

* **semantic-release-clean-package-json:** reworked this plugin to use the `publish` and `success` functions, to have the correct state on git ([#112](https://github.com/anolilab/semantic-release/issues/112)) ([734d48a](https://github.com/anolilab/semantic-release/commit/734d48a6c5a386a7ceecef5e84d758eb63708fcc))


### Dependencies

* **@anolilab/semantic-release-pnpm:** upgraded to 1.1.9

## @anolilab/semantic-release-clean-package-json 1.0.0 (2025-01-16)

### Features

* new clean-package-json package for semantic-release ([#106](https://github.com/anolilab/semantic-release/issues/106)) ([94218d7](https://github.com/anolilab/semantic-release/commit/94218d72b21e698f46b96749d9216209782d381a))

### Bug Fixes

* changed plugin order to not publish cleaned package.json to GitHub ([6673e69](https://github.com/anolilab/semantic-release/commit/6673e69723fd340380250fa2d986e4c37091351f))
* remove usage of aggregate-error library ([e0c6e95](https://github.com/anolilab/semantic-release/commit/e0c6e95b07416d6694fa192ddca96e17a4c1c4b8))
* **semantic-release-clean-package-json:** fixed circular dependency ([93b51f9](https://github.com/anolilab/semantic-release/commit/93b51f9c03503e10f0c0a23dcd55273622b40aa0))
* **semantic-release-clean-package-json:** removed cjs exports, semantic-release don't support both types at the same time ([48c93c0](https://github.com/anolilab/semantic-release/commit/48c93c09cd5d6429b7658bc9a4fc573ea23462e2))


### Dependencies

* **@anolilab/semantic-release-pnpm:** upgraded to 1.1.8

## @anolilab/semantic-release-clean-package-json [1.0.0-alpha.2](https://github.com/anolilab/semantic-release/compare/@anolilab/semantic-release-clean-package-json@1.0.0-alpha.1...@anolilab/semantic-release-clean-package-json@1.0.0-alpha.2) (2025-01-16)

### Bug Fixes

* changed plugin order to not publish cleaned package.json to GitHub ([6673e69](https://github.com/anolilab/semantic-release/commit/6673e69723fd340380250fa2d986e4c37091351f))

## @anolilab/semantic-release-clean-package-json 1.0.0-alpha.1 (2025-01-15)

### Features

* new clean-package-json package for semantic-release ([#106](https://github.com/anolilab/semantic-release/issues/106)) ([94218d7](https://github.com/anolilab/semantic-release/commit/94218d72b21e698f46b96749d9216209782d381a))

### Bug Fixes

* **semantic-release-clean-package-json:** fixed circular dependency ([93b51f9](https://github.com/anolilab/semantic-release/commit/93b51f9c03503e10f0c0a23dcd55273622b40aa0))

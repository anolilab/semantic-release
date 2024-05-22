import package_ from "../../package.json";

const linkify = (file: string) => `${package_.homepage}/blob/main/${file}`;

interface ErrorDetails {
    details: string;
    message: string;
}

export type ErrorDefinition = (context: ErrorContext) => ErrorDetails;

export interface ErrorContext {
    npmPublish?: boolean;
    npmrc?: string;
    pkgRoot?: string;
    publishBranch?: string;
    registry?: string;
    tarballDir?: string;
    version?: string;
}

export const errors = {
    EINVALIDBRANCHES: (branches: string[]) => {
        return {
            details: `The [branches option](${linkify("README.md#branches")}) option, if defined, must be an array of \`String\`.
Your configuration for the \`branches\` option is \`${branches}\`.`,
            message: "Invalid `branches` option.",
        };
    },
    EINVALIDNPMPUBLISH: ({ npmPublish }: ErrorContext) => {
        return {
            details: `The [npmPublish option](${linkify("README.md#npmpublish")}) option, if defined, must be a \`Boolean\`.
Your configuration for the \`npmPublish\` option is \`${npmPublish}\`.`,
            message: "Invalid `npmPublish` option.",
        };
    },
    EINVALIDNPMTOKEN: ({ registry }: ErrorContext) => {
        return {
            details: `The [npm token](${linkify(
                "README.md#npm-registry-authentication",
            )}) configured in the \`NPM_TOKEN\` environment variable must be a valid [token](https://docs.npmjs.com/getting-started/working_with_tokens) allowing to publish to the registry \`${registry}\`.
If you are using Two Factor Authentication for your account, set its level to ["Authorization only"](https://docs.npmjs.com/getting-started/using-two-factor-authentication#levels-of-authentication) in your account settings. **semantic-release** cannot publish with the default "Authorization and writes" level.
Please make sure to set the \`NPM_TOKEN\` environment variable in your CI with the exact value of the npm token.`,
            message: "Invalid npm token.",
        };
    },
    EINVALIDPKGROOT: ({ pkgRoot }: ErrorContext) => {
        return {
            details: `The [pkgRoot option](${linkify("README.md#pkgroot")}) option, if defined, must be a \`String\`.
Your configuration for the \`pkgRoot\` option is \`${pkgRoot}\`.`,
            message: "Invalid `pkgRoot` option.",
        };
    },
    EINVALIDPNPM: ({ version }: ErrorContext) => {
        return {
            details: `The version of Pnpm that you are using is not compatible. Please refer to [the README](${linkify(
                "README.md#install",
            )}) to review which versions of Pnpm are currently supported

Your version of Pnpm is "${version}".`,
            message: "Incompatible Pnpm version detected.",
        };
    },
    EINVALIDPUBLISHBRANCH: ({ publishBranch }: ErrorContext) => {
        return {
            details: `The [publishBranch option](${linkify("README.md#publishBranch")}) option, if defined, must be a \`String\`.
Your configuration for the \`publishBranch\` option is \`${publishBranch}\`.`,
            message: "Invalid `publishBranch` option.",
        };
    },
    EINVALIDTARBALLDIR: ({ tarballDir }: ErrorContext) => {
        return {
            details: `The [tarballDir option](${linkify("README.md#tarballdir")}) option, if defined, must be a \`String\`.
Your configuration for the \`tarballDir\` option is \`${tarballDir}\`.`,
            message: "Invalid `tarballDir` option.",
        };
    },
    ENONPMTOKEN: ({ registry }: ErrorContext) => {
        return {
            details: `An [npm token](${linkify(
                "README.md#npm-registry-authentication",
            )}) must be created and set in the \`NPM_TOKEN\` environment variable on your CI environment.
Please make sure to create an [npm token](https://docs.npmjs.com/getting-started/working_with_tokens#how-to-create-new-tokens) and to set it in the \`NPM_TOKEN\` environment variable on your CI environment. The token must allow to publish to the registry \`${registry}\`.`,
            message: "No npm token specified.",
        };
    },
    ENOPKG: () => {
        return {
            details: `A [package.json file](https://docs.npmjs.com/files/package.json) at the root of your project is required to release on npm.
Please follow the [npm guideline](https://docs.npmjs.com/getting-started/creating-node-modules) to create a valid \`package.json\` file.`,
            message: "Missing `package.json` file.",
        };
    },
    ENOPKGNAME: () => {
        return {
            details: `The \`package.json\`'s [name](https://docs.npmjs.com/files/package.json#name) property is required in order to publish a package to the npm registry.
Please make sure to add a valid \`name\` for your package in your \`package.json\`.`,
            message: "Missing `name` property in `package.json`.",
        };
    },
    ENOPNPM: () => {
        return {
            details: `The Pnpm CLI could not be found in your PATH. Make sure Pnpm is installed and try again.`,
            message: "Pnpm not found.",
        };
    },
    ENOPNPMRC: () => {
        return {
            details: `Didnt find a \`.npmrc\` file or it was not possible to create , in the root of your project.`,
            message: "Missing `.npmrc` file.",
        };
    },
};

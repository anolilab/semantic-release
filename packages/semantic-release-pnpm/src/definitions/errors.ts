import packageJson from "../../package.json";

/**
 * Build an absolute URL to a file within the repository based on the `homepage` field of the plugin
 * package.json (which points to the GitHub repository).
 * @param {string} file – Relative path within the repository.
 * @returns {string} GitHub URL to the requested file on the `main` branch.
 */

const linkify = (file: string) => `${packageJson.homepage}/blob/main/${file}`;

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

export const errors: {
    EINVALIDBRANCHES: (branches: string[]) => { details: string; message: string };
    EINVALIDNPMAUTH: ({ registry }: ErrorContext) => { details: string; message: string };
    EINVALIDNPMPUBLISH: ({ npmPublish }: ErrorContext) => { details: string; message: string };
    EINVALIDNPMTOKEN: ({ registry }: ErrorContext) => { details: string; message: string };
    EINVALIDPKGROOT: ({ pkgRoot }: ErrorContext) => { details: string; message: string };
    EINVALIDPNPM: ({ version }: ErrorContext) => { details: string; message: string };
    EINVALIDPUBLISHBRANCH: ({ publishBranch }: ErrorContext) => { details: string; message: string };
    EINVALIDTARBALLDIR: ({ tarballDir }: ErrorContext) => { details: string; message: string };
    ENONPMTOKEN: ({ registry }: ErrorContext) => { details: string; message: string };
    ENOPKG: () => { details: string; message: string };
    ENOPKGNAME: () => { details: string; message: string };
    ENOPNPM: () => { details: string; message: string };
    ENOPNPMRC: () => { details: string; message: string };
} = {
    EINVALIDBRANCHES: (branches: string[]) => {
        return {
            details: `The [branches option](${linkify("README.md#branches")}) option, if defined, must be an array of \`String\`.
Your configuration for the \`branches\` option is \`${branches.join(",")}\`.`,
            message: "Invalid `branches` option.",
        };
    },
    EINVALIDNPMAUTH: ({ registry }: ErrorContext) => {
        return {
            details: `The [authentication required to publish](${linkify(
                "README.md#npm-registry-authentication",
            )}) configured in the \`NPM_TOKEN\` environment variable must be a valid [token](https://docs.npmjs.com/getting-started/working_with_tokens) allowed to publish to the registry \`${String(registry)}\`.
Please make sure to set the \`NPM_TOKEN\` environment variable in your CI with the exact value of the npm token.`,
            message: "Invalid npm authentication.",
        };
    },
    EINVALIDNPMPUBLISH: ({ npmPublish }: ErrorContext) => {
        return {
            details: `The [npmPublish option](${linkify("README.md#npmpublish")}) option, if defined, must be a \`Boolean\`.
Your configuration for the \`npmPublish\` option is \`${String(npmPublish)}\`.`,
            message: "Invalid `npmPublish` option.",
        };
    },
    EINVALIDNPMTOKEN: ({ registry }: ErrorContext) => {
        return {
            details: `The [npm token](${linkify(
                "README.md#npm-registry-authentication",
            )}) configured in the \`NPM_TOKEN\` environment variable must be a valid [token](https://docs.npmjs.com/getting-started/working_with_tokens) allowing to publish to the registry \`${String(registry)}\`.
Please verify your authentication configuration.`,
            message: "Invalid npm token.",
        };
    },
    EINVALIDPKGROOT: ({ pkgRoot }: ErrorContext) => {
        return {
            details: `The [pkgRoot option](${linkify("README.md#pkgroot")}) option, if defined, must be a \`String\`.
Your configuration for the \`pkgRoot\` option is \`${String(pkgRoot)}\`.`,
            message: "Invalid `pkgRoot` option.",
        };
    },
    EINVALIDPNPM: ({ version }: ErrorContext) => {
        return {
            details: `The version of Pnpm that you are using is not compatible. Please refer to [the README](${linkify(
                "README.md#install",
            )}) to review which versions of Pnpm are currently supported

Your version of Pnpm is "${String(version)}".`,
            message: "Incompatible Pnpm version detected.",
        };
    },
    EINVALIDPUBLISHBRANCH: ({ publishBranch }: ErrorContext) => {
        return {
            details: `The [publishBranch option](${linkify("README.md#publishBranch")}) option, if defined, must be a \`String\`.
Your configuration for the \`publishBranch\` option is \`${String(publishBranch)}\`.`,
            message: "Invalid `publishBranch` option.",
        };
    },
    EINVALIDTARBALLDIR: ({ tarballDir }: ErrorContext) => {
        return {
            details: `The [tarballDir option](${linkify("README.md#tarballdir")}) option, if defined, must be a \`String\`.
Your configuration for the \`tarballDir\` option is \`${String(tarballDir)}\`.`,
            message: "Invalid `tarballDir` option.",
        };
    },
    ENONPMTOKEN: ({ registry }: ErrorContext) => {
        return {
            details: `When not publishing through [trusted publishing](https://docs.npmjs.com/trusted-publishers), an [npm token](${linkify(
                "README.md#npm-registry-authentication",
            )}) must be created and set in the \`NPM_TOKEN\` environment variable on your CI environment.
Please make sure to create an [npm token](https://docs.npmjs.com/getting-started/working_with_tokens#how-to-create-new-tokens) and set it in the \`NPM_TOKEN\` environment variable on your CI environment. The token must allow publishing to the registry \`${registry}\`.`,
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

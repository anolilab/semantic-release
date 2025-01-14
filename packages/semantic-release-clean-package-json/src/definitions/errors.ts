// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
    ENOPKG: () => { details: string; message: string };
    ENOPKGNAME: () => { details: string; message: string };
} = {
    ENOPKGNAME: () => {
        return {
            details: `The \`package.json\`'s [name](https://docs.npmjs.com/files/package.json#name) property is required in order to publish a package to the npm registry.
Please make sure to add a valid \`name\` for your package in your \`package.json\`.`,
            message: "Missing `name` property in `package.json`.",
        };
    },
    ENOPKG: () => {
        return {
            details: `A [package.json file](https://docs.npmjs.com/files/package.json) at the root of your project is required to release on npm.
Please follow the [npm guideline](https://docs.npmjs.com/getting-started/creating-node-modules) to create a valid \`package.json\` file.`,
            message: "Missing `package.json` file.",
        };
    },
};

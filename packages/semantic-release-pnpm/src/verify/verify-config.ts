import type SemanticReleaseError from "@semantic-release/error";

import type { PluginConfig } from "../definitions/plugin-config";
import getError from "../utils/get-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isString = (value: any): boolean => typeof value === "string";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNil = (value: any): boolean => value === null || value === undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNonEmptyString = (value: any): boolean => {
    if (!isString(value)) {
        return false;
    }

    return (value as string).trim() !== "";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatorFunction = (value: any) => boolean;

const VALIDATORS: Record<string, ValidatorFunction> = {
    branches: Array.isArray,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    npmPublish: (value: any): boolean => typeof value === "boolean",
    pkgRoot: isNonEmptyString,
    publishBranch: isNonEmptyString,
    tarballDir: isNonEmptyString,
};

export default (config: PluginConfig): SemanticReleaseError[] =>
    // eslint-disable-next-line unicorn/no-array-reduce
    Object.entries(config).reduce<SemanticReleaseError[]>((errors, [option, value]) => {
        if (isNil(value)) {
            return errors;
        }

        if (!(option in VALIDATORS)) {
            return errors;
        }

        if (VALIDATORS[option]?.(value)) {
            return errors;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [...errors, getError(`EINVALID${option.toUpperCase()}` as any, { [option]: value })];
    }, []);

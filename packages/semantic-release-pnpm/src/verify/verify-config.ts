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

/**
 * Validate user-supplied plugin options and return an array of {@link SemanticReleaseError}s for
 * every option that fails its type/format constraint. The function is intentionally side-effect
 * free so that each error can later be aggregated by the caller.
 *
 * Currently validated options:
 * • branches – must be an array of branch definitions.
 * • npmPublish – must be a boolean.
 * • pkgRoot, publishBranch, tarballDir – must be non-empty strings.
 *
 * Options that are `null` or `undefined` are ignored (treated as not provided).
 * @param config – Plugin configuration object to validate.
 * @returns An array of validation errors (empty when the configuration is valid).
 */
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

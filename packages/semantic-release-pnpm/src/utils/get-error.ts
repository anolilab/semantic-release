/* eslint-disable jsdoc/check-tag-names */
import SemanticReleaseError from "@semantic-release/error";

import type { ErrorContext, ErrorDefinition } from "../definitions/errors";
import { errors } from "../definitions/errors";

/**
 * Return a {@link SemanticReleaseError} instance pre-configured with message and details from the
 * plugin's error catalogue. This helper guarantees type-safety by ensuring that `code` is one of the
 * known keys.
 * @typeParam T – One of the keys from the internal {@link errors} map.
 * @param code – Error code referencing a predefined error factory.
 * @param [context] – Optional values injected into the error message template.
 * @returns Fully initialised semantic-release error instance.
 */
const getError = <T extends keyof typeof errors>(code: T, context: ErrorContext = {}): SemanticReleaseError => {
    const { details, message }: { details?: string; message: string } = (errors[code] as ErrorDefinition)(context);

    return new SemanticReleaseError(message, code, details);
};

export default getError;

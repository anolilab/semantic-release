import SemanticReleaseError from "@semantic-release/error";

import type { ErrorContext, ErrorDefinition } from "../definitions/errors";
import { errors } from "../definitions/errors";

/**
 * Create a typed {@link SemanticReleaseError} instance from the predefined error catalogue.
 *
 * @typeParam T - A key of the {@link errors} map.
 *
 * @param {T}          code     Error code referencing the entry inside {@link errors}.
 * @param {ErrorContext} [context={}] Additional interpolation values used by the error factory.
 *
 * @returns {SemanticReleaseError} Fully initialised semantic-release error.
 */
export default <T extends keyof typeof errors>(code: T, context: ErrorContext = {}): SemanticReleaseError => {
    // eslint-disable-next-line security/detect-object-injection
    const { details, message }: { details?: string; message: string } = (errors[code] as ErrorDefinition)(context);

    return new SemanticReleaseError(message, code, details);
};

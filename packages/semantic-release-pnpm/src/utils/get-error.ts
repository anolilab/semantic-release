import SemanticReleaseError from "@semantic-release/error";

import type { ErrorContext, ErrorDefinition } from "../definitions/errors";
import { errors } from "../definitions/errors";

export default <T extends keyof typeof errors>(code: T, context: ErrorContext = {}): SemanticReleaseError => {
    const { details, message }: { details?: string; message: string } = (errors[code] as ErrorDefinition)(context);

    return new SemanticReleaseError(message, code, details);
};

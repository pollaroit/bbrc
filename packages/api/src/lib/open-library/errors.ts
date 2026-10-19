export type OpenLibraryErrorCode =
	| "timeout"
	| "unavailable"
	| "not_found"
	| "invalid_response";

export class OpenLibraryError extends Error {
	readonly code: OpenLibraryErrorCode;

	constructor(
		message: string,
		code: OpenLibraryErrorCode,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "OpenLibraryError";
		this.code = code;
	}

	/** Member- or admin-facing copy for API responses. */
	toUserMessage(): string {
		return this.message;
	}
}

export function isOpenLibraryError(error: unknown): error is OpenLibraryError {
	return error instanceof OpenLibraryError;
}

function errorCauseCode(error: unknown): string | undefined {
	if (error == null || typeof error !== "object") {
		return undefined;
	}

	const cause = "cause" in error ? error.cause : error;
	if (cause == null || typeof cause !== "object") {
		return undefined;
	}

	if ("code" in cause && typeof cause.code === "string") {
		return cause.code;
	}

	return undefined;
}

export function isRetryableOpenLibraryFetchError(error: unknown): boolean {
	const code = errorCauseCode(error);
	if (!code) {
		return error instanceof TypeError;
	}

	return (
		code === "UND_ERR_CONNECT_TIMEOUT" ||
		code === "UND_ERR_HEADERS_TIMEOUT" ||
		code === "UND_ERR_BODY_TIMEOUT" ||
		code === "ECONNRESET" ||
		code === "ETIMEDOUT" ||
		code === "EAI_AGAIN"
	);
}

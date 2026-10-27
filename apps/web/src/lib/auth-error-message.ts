/** Better Auth error codes we show a specific message for (`auth.errors.*`). */
const CODE_TO_KEY = {
	INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
	INVALID_PASSWORD: "invalidCredentials",
	USER_ALREADY_EXISTS: "userExists",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userExists",
	USERNAME_IS_ALREADY_TAKEN: "usernameTaken",
	USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER: "usernameTaken",
	INVALID_EMAIL: "invalidEmail",
	PASSWORD_TOO_SHORT: "passwordTooShort",
	PASSWORD_TOO_LONG: "passwordTooLong",
	TOO_MANY_REQUESTS: "tooManyRequests",
} as const;

export type AuthErrorKey =
	| (typeof CODE_TO_KEY)[keyof typeof CODE_TO_KEY]
	| "generic";

/** Which `auth.errors.*` message fits a Better Auth error (`generic` when it is not a known one). */
export function authErrorKey(
	error: { code?: string; status?: number } | null | undefined,
): AuthErrorKey {
	if (error?.status === 429) return "tooManyRequests";
	const code = error?.code?.toUpperCase();
	return (
		code && code in CODE_TO_KEY
			? CODE_TO_KEY[code as keyof typeof CODE_TO_KEY]
			: "generic"
	) as AuthErrorKey;
}

/** Where Better Auth sends someone after they verify their email. */
export function verifyEmailCallbackUrl(origin: string): string {
	return `${origin.replace(/\/$/, "")}/sign-in`;
}

/** App page Better Auth redirects to after the reset link is opened. */
export function resetPasswordRedirectUrl(origin: string): string {
	return `${origin.replace(/\/$/, "")}/reset-password`;
}

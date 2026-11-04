/** Allowed special characters for a new password. */
export const PASSWORD_SPECIAL_CHARS = "_$%#@!^&*()-[]{}" as const;

export const PASSWORD_MIN_LENGTH = 7;
export const PASSWORD_MAX_LENGTH = 64;

const SPECIAL_CLASS = "[_$%#@!^&*()\\[\\]{}-]";
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;
const HAS_SPECIAL = new RegExp(SPECIAL_CLASS);

export const PASSWORD_REQUIREMENTS = `At least ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a lowercase letter, a digit, and one of ${PASSWORD_SPECIAL_CHARS}.`;

export function newPasswordIssues(password: string): string[] {
	const issues: string[] = [];
	if (password.length < PASSWORD_MIN_LENGTH) {
		issues.push(
			`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
		);
	}
	if (password.length > PASSWORD_MAX_LENGTH) {
		issues.push(
			`Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
		);
	}
	if (!HAS_LOWER.test(password)) {
		issues.push("Add a lowercase letter");
	}
	if (!HAS_UPPER.test(password)) {
		issues.push("Add an uppercase letter");
	}
	if (!HAS_DIGIT.test(password)) {
		issues.push("Add a digit");
	}
	if (!HAS_SPECIAL.test(password)) {
		issues.push(`Add one of ${PASSWORD_SPECIAL_CHARS}`);
	}
	return issues;
}

export function isValidNewPassword(password: string): boolean {
	return newPasswordIssues(password).length === 0;
}

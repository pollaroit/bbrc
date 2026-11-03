import type { PasswordChangedProps } from "./templates/password-changed";
import type { ResetPasswordProps } from "./templates/reset-password";
import type { VerifyEmailProps } from "./templates/verify-email";

export const EMAIL_FIXTURES = {
	verifyEmail: {
		name: "Leo Tolstoy",
		verifyUrl: "https://bbrc.app/api/auth/verify-email?token=example",
	} satisfies VerifyEmailProps,
	resetPassword: {
		name: "Leo Tolstoy",
		resetUrl: "https://bbrc.app/reset-password?token=example",
	} satisfies ResetPasswordProps,
	passwordChanged: {
		name: "Leo Tolstoy",
	} satisfies PasswordChangedProps,
} as const;

export type EmailTemplateId = keyof typeof EMAIL_FIXTURES;

export type EmailTemplateProps = {
	verifyEmail: VerifyEmailProps;
	resetPassword: ResetPasswordProps;
	passwordChanged: PasswordChangedProps;
};

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateId, string> = {
	verifyEmail: "Verify email",
	resetPassword: "Reset password",
	passwordChanged: "Password changed",
};
